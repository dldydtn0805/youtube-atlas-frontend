import { FormEvent, FocusEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../features/auth/useAuth';
import { isApiConfigured } from '../../lib/api';
import { useComments, useCreateComment } from '../../features/comments/queries';
import {
  COMMENT_COOLDOWN_SECONDS,
  CommentSubmissionError,
  getLocalSpamViolation,
  getRemainingDurationMs,
  normalizeMessageContent,
  pruneRecentComments,
  type RecentCommentSnapshot,
  toCommentSubmissionError,
} from '../../features/comments/spam';
import type { ChatMessage } from '../../features/comments/types';
import './CommentSection.css';

interface CommentSectionProps {
  videoId?: string;
  videoTitle?: string;
}

const CHAT_PARTICIPANT_STORAGE_KEY = 'youtube-atlas-chat-participant-id';
const CHAT_COMPOSER_FOCUSED_ATTRIBUTE = 'data-chat-composer-focus';
const MOBILE_COMMENT_BREAKPOINT = 768;

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

function formatCooldownFeedback(seconds: number) {
  return `채팅 흐름을 위해 ${seconds}초 후에 다시 보낼 수 있어요.`;
}

function CommentSection({ videoId, videoTitle }: CommentSectionProps) {
  const { logout, status, user } = useAuth();
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState<CommentSubmissionError | null>(null);
  const [participantId] = useState(getChatParticipantId);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const commentListRef = useRef<HTMLDivElement | null>(null);
  const cooldownDeadlineByVideoRef = useRef<Record<string, number>>({});
  const recentMessagesByVideoRef = useRef<Record<string, RecentCommentSnapshot[]>>({});
  const commentsQuery = useComments(videoId, isApiConfigured);
  const createCommentMutation = useCreateComment();
  const remainingCooldownMs = getRemainingDurationMs(cooldownEndsAt);
  const remainingCooldownSeconds = Math.ceil(remainingCooldownMs / 1000);
  const isCooldownActive = remainingCooldownMs > 0;
  const isSubmitDisabled = createCommentMutation.isPending || isCooldownActive;
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const feedbackMessage = isCooldownActive
    ? formatCooldownFeedback(remainingCooldownSeconds)
    : submissionError?.message;

  useEffect(() => {
    setContent('');
    setSubmissionError(null);
    setCooldownEndsAt(getCurrentCooldownDeadline(videoId, cooldownDeadlineByVideoRef.current));
  }, [videoId]);

  useEffect(() => {
    if (!cooldownEndsAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownEndsAt(getCurrentCooldownDeadline(videoId, cooldownDeadlineByVideoRef.current));
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cooldownEndsAt, videoId]);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_COMMENT_BREAKPOINT}px)`);
    const syncIsMobileLayout = () => {
      setIsMobileLayout(mediaQuery.matches);
    };

    syncIsMobileLayout();
    mediaQuery.addEventListener('change', syncIsMobileLayout);

    return () => {
      mediaQuery.removeEventListener('change', syncIsMobileLayout);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearComposerFocusState();
    };
  }, []);

  function clearComposerFocusState() {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.removeAttribute(CHAT_COMPOSER_FOCUSED_ATTRIBUTE);

    if (composerRef.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  function beginCooldown(seconds = COMMENT_COOLDOWN_SECONDS) {
    if (!videoId) {
      return;
    }

    const nextCooldownEndsAt = Date.now() + seconds * 1000;

    cooldownDeadlineByVideoRef.current[videoId] = nextCooldownEndsAt;
    setCooldownEndsAt(nextCooldownEndsAt);
  }

  function getRecentMessages(currentVideoId: string, now = Date.now()) {
    const nextRecentMessages = pruneRecentComments(
      recentMessagesByVideoRef.current[currentVideoId] ?? [],
      now,
    );

    recentMessagesByVideoRef.current[currentVideoId] = nextRecentMessages;

    return nextRecentMessages;
  }

  async function submitMessage() {
    if (!videoId) {
      return;
    }

    if (isCooldownActive) {
      return;
    }

    const now = Date.now();
    const normalizedContent = normalizeMessageContent(content);
    const recentMessages = getRecentMessages(videoId, now);
    const localViolation = getLocalSpamViolation(recentMessages, normalizedContent, now);

    if (localViolation) {
      const nextError =
        localViolation.code === 'cooldown'
          ? new CommentSubmissionError('cooldown', {
              retryAfterSeconds: localViolation.retryAfterSeconds,
            })
          : new CommentSubmissionError('duplicate');

      setSubmissionError(nextError);

      if (localViolation.code === 'cooldown') {
        beginCooldown(localViolation.retryAfterSeconds);
      }

      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        author: isAuthenticated ? user?.displayName ?? '' : author,
        content,
        clientId: participantId,
        videoId,
      });

      recentMessagesByVideoRef.current[videoId] = [
        ...recentMessages,
        { normalizedContent, sentAt: now },
      ];
      setSubmissionError(null);
      setContent('');
      clearComposerFocusState();
      beginCooldown();
    } catch (error) {
      const nextError = toCommentSubmissionError(error);

      setSubmissionError(nextError);

      if (nextError.code === 'auth') {
        void logout();
      }

      if (nextError.code === 'cooldown') {
        beginCooldown(nextError.retryAfterSeconds ?? COMMENT_COOLDOWN_SECONDS);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    void submitMessage();
  }

  function handleAuthorChange(value: string) {
    setAuthor(value);

    if (submissionError && !isCooldownActive) {
      setSubmissionError(null);
    }
  }

  function handleContentChange(value: string) {
    setContent(value);

    if (submissionError && !isCooldownActive) {
      setSubmissionError(null);
    }
  }

  function handleComposerFocusCapture() {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute(CHAT_COMPOSER_FOCUSED_ATTRIBUTE, 'true');
  }

  function handleComposerBlurCapture(event: FocusEvent<HTMLFormElement>) {
    if (typeof document === 'undefined') {
      return;
    }

    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement instanceof Node && composerRef.current?.contains(nextFocusedElement)) {
      return;
    }

    window.setTimeout(() => {
      if (!composerRef.current?.contains(document.activeElement)) {
        document.documentElement.removeAttribute(CHAT_COMPOSER_FOCUSED_ATTRIBUTE);
      }
    }, 0);
  }

  if (!videoId) {
    return <p className="comment-section__status">채팅에 참여하려면 영상을 먼저 선택해 주세요.</p>;
  }

  if (!isApiConfigured) {
    return (
      <div className="comment-section__empty">
        <p className="comment-section__status">
          백엔드 연결 정보가 없어서 실시간 채팅이 비활성화되어 있습니다.
        </p>
        <p className="comment-section__hint">
          `.env.local`에 `VITE_API_BASE_URL`을 추가하면 바로 활성화됩니다.
        </p>
      </div>
    );
  }

  const composerContent = (
    <form
      ref={composerRef}
      className={`comment-composer${isMobileLayout ? ' comment-composer--mobile-layer' : ''}`}
      onBlurCapture={handleComposerBlurCapture}
      onFocusCapture={handleComposerFocusCapture}
      onSubmit={handleSubmit}
    >
      <div className="comment-composer__top">
        {isAuthenticated && user ? (
          <div className="comment-composer__identity">
            {user.pictureUrl ? (
              <img
                alt={`${user.displayName} 프로필`}
                className="comment-composer__avatar"
                src={user.pictureUrl}
              />
            ) : (
              <span
                aria-hidden="true"
                className="comment-composer__avatar comment-composer__avatar--fallback"
              >
                {(user.displayName || user.email).slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="comment-composer__identity-copy">
              <strong>{user.displayName || user.email}</strong>
            </div>
          </div>
        ) : (
          <input
            className="comment-composer__name"
            maxLength={30}
            onChange={(event) => handleAuthorChange(event.target.value)}
            placeholder="닉네임 (비워두면 익명)"
            type="text"
            value={author}
          />
        )}
      </div>
      <div className="comment-composer__bottom">
        <textarea
          className="comment-composer__textarea"
          maxLength={500}
          onChange={(event) => handleContentChange(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="메시지를 입력하세요."
          required
          rows={1}
          value={content}
        />
        <button
          className="comment-composer__submit"
          disabled={isSubmitDisabled}
          type="submit"
        >
          {createCommentMutation.isPending
            ? '전송 중...'
            : isCooldownActive
              ? `${remainingCooldownSeconds}초 대기`
              : '보내기'}
        </button>
      </div>
      <div className="comment-composer__footer">
        {feedbackMessage ? (
          <p
            aria-live="polite"
            className={`comment-composer__feedback ${
              isCooldownActive
                ? 'comment-composer__feedback--cooldown'
                : 'comment-composer__feedback--error'
            }`}
          >
            {feedbackMessage}
          </p>
        ) : (
          <span className="comment-composer__feedback comment-composer__feedback--muted">
            공개 채팅방입니다. 개인 정보는 적지 마세요.
          </span>
        )}
        <span className="comment-composer__counter">{content.length}/500</span>
      </div>
    </form>
  );

  return (
    <section className="comment-section" aria-label="실시간 익명 채팅">
      <header className="comment-section__header">
        <div className="comment-section__room">
          <h3 className="comment-section__title">{videoTitle ?? '현재 영상 채팅방'}</h3>
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
      {isMobileLayout ? <div className="comment-composer-spacer" aria-hidden="true" /> : composerContent}
      {isMobileLayout && typeof document !== 'undefined'
        ? createPortal(composerContent, document.body)
        : null}
    </section>
  );
}

function getCurrentCooldownDeadline(
  videoId: string | undefined,
  cooldownDeadlineByVideo: Record<string, number>,
) {
  if (!videoId) {
    return null;
  }

  const currentCooldownDeadline = cooldownDeadlineByVideo[videoId];

  if (!currentCooldownDeadline) {
    return null;
  }

  if (getRemainingDurationMs(currentCooldownDeadline) === 0) {
    delete cooldownDeadlineByVideo[videoId];

    return null;
  }

  return currentCooldownDeadline;
}

export default CommentSection;
