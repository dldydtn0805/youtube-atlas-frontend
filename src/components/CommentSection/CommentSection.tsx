import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useComments, useCreateComment } from '../../features/comments/queries';
import type { ChatMessage } from '../../features/comments/types';
import './CommentSection.css';

interface CommentSectionProps {
  videoId?: string;
  videoTitle?: string;
}

const CHAT_PARTICIPANT_STORAGE_KEY = 'youtube-atlas-chat-participant-id';

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getChatParticipantId() {
  if (typeof window === 'undefined') {
    return 'server-render';
  }

  const storedValue = window.localStorage.getItem(CHAT_PARTICIPANT_STORAGE_KEY);

  if (storedValue) {
    return storedValue;
  }

  const nextValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `participant-${Date.now()}`;

  window.localStorage.setItem(CHAT_PARTICIPANT_STORAGE_KEY, nextValue);

  return nextValue;
}

function isOwnMessage(message: ChatMessage, participantId: string) {
  return message.client_id === participantId;
}

function CommentSection({ videoId, videoTitle }: CommentSectionProps) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [participantId] = useState(getChatParticipantId);
  const commentListRef = useRef<HTMLDivElement | null>(null);
  const commentsQuery = useComments(videoId, isSupabaseConfigured);
  const createCommentMutation = useCreateComment();

  useEffect(() => {
    setContent('');
  }, [videoId]);

  useEffect(() => {
    const commentList = commentListRef.current;

    if (!commentList) {
      return;
    }

    commentList.scrollTo({
      top: commentList.scrollHeight,
      behavior: 'smooth',
    });
  }, [commentsQuery.data]);

  function submitMessage() {
    if (!videoId) {
      return;
    }

    createCommentMutation.mutate(
      {
        author,
        content,
        clientId: participantId,
        videoId,
      },
      {
        onSuccess: () => {
          setContent('');
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (createCommentMutation.isPending) {
      return;
    }

    submitMessage();
  }

  if (!videoId) {
    return <p className="comment-section__status">채팅에 참여하려면 영상을 먼저 선택해 주세요.</p>;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="comment-section__empty">
        <p className="comment-section__status">
          Supabase 연결 정보가 없어서 실시간 채팅이 비활성화되어 있습니다.
        </p>
        <p className="comment-section__hint">
          `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 추가하면 바로 활성화됩니다.
        </p>
      </div>
    );
  }

  return (
    <section className="comment-section" aria-label="실시간 익명 채팅">
      <header className="comment-section__header">
        <div className="comment-section__room">
          <p className="comment-section__lead">Live Room</p>
          <h3 className="comment-section__title">{videoTitle ?? '현재 영상 채팅방'}</h3>
          <p className="comment-section__hint">같은 영상을 보고 있는 사람들과 바로 대화하세요.</p>
        </div>
        <div className="comment-section__meta">
          <span className="comment-section__badge">익명 채팅</span>
          <span className="comment-section__presence">
            <span className="comment-section__presence-dot" />
            실시간 연결
          </span>
        </div>
      </header>

      <div ref={commentListRef} className="comment-list" aria-live="polite">
        {commentsQuery.isLoading ? (
          <p className="comment-section__status">채팅을 불러오는 중입니다.</p>
        ) : null}
        {commentsQuery.isError ? (
          <p className="comment-section__status">
            {commentsQuery.error instanceof Error
              ? commentsQuery.error.message
              : '채팅을 불러오지 못했습니다.'}
          </p>
        ) : null}
        {!commentsQuery.isLoading && !commentsQuery.isError && commentsQuery.data?.length === 0 ? (
          <p className="comment-section__status">아직 대화가 없습니다. 첫 메시지를 보내보세요.</p>
        ) : null}
        {commentsQuery.data?.map((message) => {
          const ownMessage = isOwnMessage(message, participantId);

          return (
            <article
              key={message.id}
              className={`comment-message ${ownMessage ? 'comment-message--own' : ''}`}
            >
              <div className="comment-message__meta">
                <strong className="comment-message__author">
                  {ownMessage ? '나' : message.author}
                </strong>
                <time className="comment-message__date" dateTime={message.created_at}>
                  {formatMessageDate(message.created_at)}
                </time>
              </div>
              <p className="comment-message__bubble">{message.content}</p>
            </article>
          );
        })}
      </div>

      <form className="comment-composer" onSubmit={handleSubmit}>
        <div className="comment-composer__top">
          <input
            className="comment-composer__name"
            maxLength={30}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="닉네임 (비워두면 익명)"
            type="text"
            value={author}
          />
          <span className="comment-composer__guide">Enter 전송 · Shift+Enter 줄바꿈</span>
        </div>
        <div className="comment-composer__bottom">
          <textarea
            className="comment-composer__textarea"
            maxLength={500}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="메시지를 입력하세요."
            required
            rows={1}
            value={content}
          />
          <button
            className="comment-composer__submit"
            disabled={createCommentMutation.isPending}
            type="submit"
          >
            {createCommentMutation.isPending ? '전송 중...' : '보내기'}
          </button>
        </div>
        <div className="comment-composer__footer">
          {createCommentMutation.isError ? (
            <p className="comment-composer__feedback">
              {createCommentMutation.error instanceof Error
                ? createCommentMutation.error.message
                : '메시지 전송에 실패했습니다.'}
            </p>
          ) : (
            <span className="comment-composer__feedback comment-composer__feedback--muted">
              공개 채팅방입니다. 개인 정보는 적지 마세요.
            </span>
          )}
          <span className="comment-composer__counter">{content.length}/500</span>
        </div>
      </form>
    </section>
  );
}

export default CommentSection;
