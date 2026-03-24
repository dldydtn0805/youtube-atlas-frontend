import { ApiRequestError } from '../../lib/api';

export const COMMENT_COOLDOWN_MS = 5_000;
export const COMMENT_DUPLICATE_WINDOW_MS = 30_000;
export const COMMENT_COOLDOWN_SECONDS = COMMENT_COOLDOWN_MS / 1_000;

export const COMMENT_SPAM_DB_MESSAGES = {
  contentRequired: 'comment_content_required',
  cooldown: 'comment_spam_cooldown',
  duplicate: 'comment_spam_duplicate',
} as const;

export type CommentSubmissionErrorCode = 'cooldown' | 'duplicate' | 'validation' | 'unknown';

export interface RecentCommentSnapshot {
  normalizedContent: string;
  sentAt: number;
}

export type LocalSpamViolation =
  | {
      code: 'cooldown';
      retryAfterSeconds: number;
    }
  | {
      code: 'duplicate';
    };

export class CommentSubmissionError extends Error {
  code: CommentSubmissionErrorCode;
  retryAfterSeconds?: number;

  constructor(
    code: CommentSubmissionErrorCode,
    options: { message?: string; retryAfterSeconds?: number } = {},
  ) {
    super(options.message ?? getCommentSubmissionErrorMessage(code, options.retryAfterSeconds));
    this.name = 'CommentSubmissionError';
    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function normalizeMessageContent(content: string) {
  return content.trim().replace(/\s+/g, ' ');
}

export function getCommentSubmissionErrorMessage(
  code: CommentSubmissionErrorCode,
  retryAfterSeconds?: number,
) {
  switch (code) {
    case 'cooldown':
      return `채팅 흐름을 위해 ${retryAfterSeconds ?? COMMENT_COOLDOWN_SECONDS}초 후에 다시 보낼 수 있어요.`;
    case 'duplicate':
      return '같은 메시지는 30초 후에 다시 보낼 수 있어요.';
    case 'validation':
      return '메시지 내용을 입력해 주세요.';
    case 'unknown':
    default:
      return '메시지 전송에 실패했습니다.';
  }
}

export function getRemainingDurationMs(endsAt?: number | null, now = Date.now()) {
  if (!endsAt) {
    return 0;
  }

  return Math.max(0, endsAt - now);
}

export function isDuplicateMessage(previousContent: string, nextContent: string) {
  const normalizedPreviousContent = normalizeMessageContent(previousContent);
  const normalizedNextContent = normalizeMessageContent(nextContent);

  return normalizedPreviousContent !== '' && normalizedPreviousContent === normalizedNextContent;
}

export function isWithinCooldownWindow(
  sentAt: number,
  now = Date.now(),
  cooldownMs = COMMENT_COOLDOWN_MS,
) {
  return now - sentAt < cooldownMs;
}

export function isWithinDuplicateWindow(
  sentAt: number,
  now = Date.now(),
  duplicateWindowMs = COMMENT_DUPLICATE_WINDOW_MS,
) {
  return now - sentAt < duplicateWindowMs;
}

export function pruneRecentComments(recentComments: RecentCommentSnapshot[], now = Date.now()) {
  return recentComments.filter((comment) => isWithinDuplicateWindow(comment.sentAt, now));
}

export function getLocalSpamViolation(
  recentComments: RecentCommentSnapshot[],
  nextContent: string,
  now = Date.now(),
): LocalSpamViolation | null {
  const recentCommentsInWindow = pruneRecentComments(recentComments, now);
  const latestRecentComment = recentCommentsInWindow[recentCommentsInWindow.length - 1];

  if (latestRecentComment && isWithinCooldownWindow(latestRecentComment.sentAt, now)) {
    const remainingCooldownMs = COMMENT_COOLDOWN_MS - (now - latestRecentComment.sentAt);

    return {
      code: 'cooldown',
      retryAfterSeconds: Math.max(1, Math.ceil(remainingCooldownMs / 1_000)),
    };
  }

  const normalizedNextContent = normalizeMessageContent(nextContent);

  if (!normalizedNextContent) {
    return null;
  }

  const hasDuplicateMessage = recentCommentsInWindow.some((comment) =>
    isDuplicateMessage(comment.normalizedContent, normalizedNextContent),
  );

  if (!hasDuplicateMessage) {
    return null;
  }

  return { code: 'duplicate' };
}

export function toCommentSubmissionError(error: unknown) {
  if (error instanceof CommentSubmissionError) {
    return error;
  }

  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case 'cooldown':
        return new CommentSubmissionError('cooldown', {
          retryAfterSeconds: error.retryAfterSeconds,
        });
      case 'duplicate':
        return new CommentSubmissionError('duplicate');
      case 'bad_request':
        return new CommentSubmissionError('validation', {
          message: error.message,
        });
      default:
        return new CommentSubmissionError('unknown', {
          message: error.message || undefined,
        });
    }
  }

  const errorMessage =
    typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const errorDetails =
    typeof error === 'object' && error && 'details' in error && typeof error.details === 'string'
      ? error.details
      : undefined;
  const retryAfterSeconds = parseRetryAfterSeconds(errorDetails);

  switch (errorMessage) {
    case COMMENT_SPAM_DB_MESSAGES.contentRequired:
      return new CommentSubmissionError('validation');
    case COMMENT_SPAM_DB_MESSAGES.cooldown:
      return new CommentSubmissionError('cooldown', { retryAfterSeconds });
    case COMMENT_SPAM_DB_MESSAGES.duplicate:
      return new CommentSubmissionError('duplicate');
    default:
      return new CommentSubmissionError('unknown');
  }
}

function parseRetryAfterSeconds(details?: string) {
  const matchedRetryAfter = details?.match(/retry_after_seconds=(\d+)/);

  if (!matchedRetryAfter) {
    return undefined;
  }

  return Number(matchedRetryAfter[1]);
}
