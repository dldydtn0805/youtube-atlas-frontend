import { FormEvent, FocusEvent, KeyboardEvent, memo, useEffect, useRef, useState } from 'react';
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
import { getChatParticipantId } from '../../features/comments/participant';
import type { ChatMessage } from '../../features/comments/types';
import './CommentSection.css';

interface CommentSectionProps {
  hideHeader?: boolean;
  videoId?: string;
  videoTitle?: string;
}

const CHAT_COMPOSER_FOCUSED_ATTRIBUTE = 'data-chat-composer-focus';
const GLOBAL_CHAT_ROOM_ID = 'global';
const FALLBACK_MESSAGE_SUFFIXES = [
  '좋네요.',
  '감사합니다.',
  '잘 봤습니다.',
  '흥미롭네요.',
  '재밌네요.',
  '도움됐어요.',
  '인상적이네요.',
  '알차네요.',
  '유익하네요.',
  '멋지네요.',
  '지금 매수 하면 되나요?',
  '지금 들어가도 괜찮을까요?',
  '타이밍 좋아 보이네요.',
  '지금 분위기 괜찮네요.',
  '이거 계속 들고 가나요?',
  '설명 깔끔하네요.',
  '포인트 좋네요.',
  '이 종목 왜 오르나요?',
  '지금은 관망이 맞을까요?',
  '흐름이 좋아 보입니다.',
  '오늘도 잘 보고 갑니다.',
  '정리 감사합니다.',
  '이 부분이 핵심이네요.',
  '생각보다 강하네요.',
  '지금 매도 타이밍일까요?',
  '계속 지켜봐야겠네요.',
  '덕분에 이해됐어요.',
  '의견 참고하겠습니다.',
  '정보 감사합니다.',
  '이거 재료가 있나요?',
  '지금 눌림목인가요?',
  '관점이 좋네요.',
  '차트가 예쁘네요.',
  '이거 반등 나오나요?',
  '설명 듣고 보니 이해되네요.',
  '오늘 방송도 알차네요.',
  '이 종목 계속 봐야겠네요.',
  '분석 고맙습니다.',
  '한번 공부해봐야겠네요.',
  '지금 거래량 괜찮네요.',
] as const;

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function isOwnMessage(message: ChatMessage, participantId: string, userId?: number | null) {
  if (typeof userId === 'number' && message.user_id === userId) {
    return true;
  }

  return message.client_id === participantId;
}

function isSystemMessage(message: ChatMessage) {
  return (
    message.message_type === 'SYSTEM' ||
    typeof message.system_event_type === 'string' ||
    message.client_id.startsWith('system:')
  );
}

function isTradeSystemMessage(message: ChatMessage) {
  return message.system_event_type === 'TRADE';
}

function formatCooldownFeedback(seconds: number) {
  return `채팅 흐름을 위해 ${seconds}초 후에 다시 보낼 수 있어요.`;
}

function getSystemMessageVariant(message: ChatMessage) {
  if (message.system_event_type === 'LOGIN') {
    return 'comment-message--system-login';
  }

  if (message.system_event_type === 'TIER') {
    return 'comment-message--system-tier';
  }

  if (message.system_event_type === 'TRADE') {
    if (message.content.includes('매수')) {
      return 'comment-message--system-buy';
    }

    if (message.content.includes('매도')) {
      return 'comment-message--system-sell';
    }

    return 'comment-message--system-trade';
  }

  return 'comment-message--system-generic';
}

function getFallbackMessageContent(videoTitle?: string) {
  const normalizedTitle = videoTitle?.trim();
  const randomIndex = Math.floor(Math.random() * FALLBACK_MESSAGE_SUFFIXES.length);
  const randomSuffix = FALLBACK_MESSAGE_SUFFIXES[randomIndex] ?? FALLBACK_MESSAGE_SUFFIXES[0];

  return `${normalizedTitle || '이 영상'} ${randomSuffix}`;
}

function CommentSection({ hideHeader = false, videoId, videoTitle }: CommentSectionProps) {
  const { logout, status, user } = useAuth();
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [submissionError, setSubmissionError] = useState<CommentSubmissionError | null>(null);
  const [participantId] = useState(getChatParticipantId);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const commentListRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const cooldownDeadlineByVideoRef = useRef<Record<string, number>>({});
  const recentMessagesByVideoRef = useRef<Record<string, RecentCommentSnapshot[]>>({});
  const commentsQuery = useComments(videoId, isApiConfigured);
  const activeParticipantCount = commentsQuery.presenceQuery?.data?.active_count;
  const createCommentMutation = useCreateComment();
  const remainingCooldownMs = getRemainingDurationMs(cooldownEndsAt);
  const remainingCooldownSeconds = Math.ceil(remainingCooldownMs / 1000);
  const isCooldownActive = remainingCooldownMs > 0;
  const isSubmitDisabled = createCommentMutation.isPending || isCooldownActive;
  const isAuthenticated = status === 'authenticated' && Boolean(user);
  const feedbackMessage = isCooldownActive
    ? formatCooldownFeedback(remainingCooldownSeconds)
    : submissionError?.message;
  const visibleMessages = (commentsQuery.data ?? []).filter((message) => !isTradeSystemMessage(message));

  useEffect(() => {
    setContent('');
    setSubmissionError(null);
    setCooldownEndsAt(getCurrentCooldownDeadline(GLOBAL_CHAT_ROOM_ID, cooldownDeadlineByVideoRef.current));
  }, []);

  useEffect(() => {
    if (!cooldownEndsAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCooldownEndsAt(getCurrentCooldownDeadline(GLOBAL_CHAT_ROOM_ID, cooldownDeadlineByVideoRef.current));
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [cooldownEndsAt]);

  useEffect(() => {
    const commentList = commentListRef.current;

    if (!commentList) {
      return;
    }

    commentList.scrollTo({
      top: commentList.scrollHeight,
      behavior: 'smooth',
    });
  }, [visibleMessages]);

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

  function restoreComposerInputFocus() {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute(CHAT_COMPOSER_FOCUSED_ATTRIBUTE, 'true');
    messageInputRef.current?.focus({ preventScroll: true });
  }

  function beginCooldown(seconds = COMMENT_COOLDOWN_SECONDS) {
    const nextCooldownEndsAt = Date.now() + seconds * 1000;

    cooldownDeadlineByVideoRef.current[GLOBAL_CHAT_ROOM_ID] = nextCooldownEndsAt;
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
    if (isCooldownActive) {
      return;
    }

    const now = Date.now();
    const submittedContent = normalizeMessageContent(content)
      ? content
      : getFallbackMessageContent(videoTitle);
    const normalizedContent = normalizeMessageContent(submittedContent);
    const recentMessages = getRecentMessages(GLOBAL_CHAT_ROOM_ID, now);
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
        content: submittedContent,
        clientId: participantId,
        videoId: GLOBAL_CHAT_ROOM_ID,
      });

      recentMessagesByVideoRef.current[GLOBAL_CHAT_ROOM_ID] = [
        ...recentMessages,
        { normalizedContent, sentAt: now },
      ];
      setSubmissionError(null);
      setContent('');
      restoreComposerInputFocus();
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
      className="comment-composer"
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
          ref={messageInputRef}
          className="comment-composer__textarea"
          maxLength={500}
          onChange={(event) => handleContentChange(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="메시지를 입력하세요."
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
    <section
      className={`comment-section ${hideHeader ? 'comment-section--body-only' : ''}`}
      aria-label="실시간 익명 채팅"
    >
      {hideHeader ? null : (
        <header className="comment-section__header">
          <div className="comment-section__room">
            <h3 className="comment-section__title">전체 채팅방</h3>
          </div>
        </header>
      )}

      <div ref={commentListRef} className="comment-list" aria-live="polite">
        {typeof activeParticipantCount === 'number' ? (
          <p className="comment-section__presence comment-section__presence--overlay">
            실시간 {activeParticipantCount}명
          </p>
        ) : null}
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
        {visibleMessages.map((message) => {
          const ownMessage = isOwnMessage(message, participantId, user?.id);
          const systemMessage = isSystemMessage(message);

          if (systemMessage) {
            const systemToneClassName = getSystemMessageVariant(message);

            return (
              <article
                key={message.id}
                className={`comment-message comment-message--system ${systemToneClassName}`}
              >
                <p className="comment-message__system-text">
                  <span>{message.content}</span>
                </p>
              </article>
            );
          }

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
      {composerContent}
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

export default memo(CommentSection);
