import { act } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentSubmissionError } from '../../features/comments/spam';
import CommentSection from './CommentSection';

const useCommentsMock = vi.fn();
const useCreateCommentMock = vi.fn();
const useVideoCommentHighlightsMock = vi.fn();
const useAuthMock = vi.fn();
const authenticatedUser = {
  displayName: 'Atlas User',
  email: 'atlas@example.com',
  id: 7,
  pictureUrl: null,
  selectedTitle: null,
};

function commentHighlight(videoId: string, content: string, title = selectedTitle) {
  return {
    author: '@YouTube Viewer',
    client_id: `yt-comment:${videoId}`,
    content,
    created_at: '2026-03-22T00:00:02.000Z',
    ephemeral: true,
    id: `yt-comment:${videoId}`,
    label: '인기 댓글',
    like_count: 42,
    message_type: 'COMMENT_HIGHLIGHT',
    selected_achievement_title: title,
    source: 'YOUTUBE_COMMENT',
    video_id: videoId,
  };
}

const selectedTitle = {
  code: 'atlas_sniper',
  description: '랭크를 날카롭게 읽는 유저',
  displayName: 'Atlas Sniper',
  grade: 'RARE',
  shortName: 'A. Sniper',
} as const;

vi.mock('../../lib/api', () => ({
  isApiConfigured: true,
}));

vi.mock('../../features/comments/queries', () => ({
  useComments: (...args: unknown[]) => useCommentsMock(...args),
  useCreateComment: () => useCreateCommentMock(),
}));

vi.mock('../../features/comments/highlightQueries', () => ({
  useVideoCommentHighlights: (...args: unknown[]) => useVideoCommentHighlightsMock(...args),
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('CommentSection', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T00:00:00.000Z'));
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: '(max-width: 768px)',
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    window.localStorage?.removeItem?.('youtube-atlas-chat-participant-id');
    useCommentsMock.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      presenceQuery: {
        data: null,
      },
    });
    useVideoCommentHighlightsMock.mockReturnValue({
      data: [],
    });
    useAuthMock.mockReturnValue({
      accessToken: 'access-token-1',
      logout: vi.fn(),
      status: 'authenticated',
      user: authenticatedUser,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('clears the input after a successful send', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 1,
    });

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요.');

    fireEvent.change(textarea, { target: { value: 'hello world' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue('');
  });

  it('shows a read-only chat notice for anonymous users', async () => {
    const mutateAsync = vi.fn();

    useAuthMock.mockReturnValue({
      accessToken: null,
      logout: vi.fn(),
      status: 'anonymous',
      user: null,
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    expect(screen.queryByPlaceholderText('메시지를 입력하세요.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '보내기' })).not.toBeInTheDocument();
    expect(screen.getByText('로그인 후 채팅 참여 가능')).toBeInTheDocument();
    expect(screen.getByText('지금은 채팅을 읽을 수만 있어요.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('sends a fallback message based on the video title when the input is empty', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 1,
    });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="멋진 영상 제목" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '멋진 영상 제목 유익하네요.',
      }),
    );

    randomSpy.mockRestore();
  });

  it('keeps the message input focused after a successful send', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 1,
    });

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요.');

    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: 'hello world' } });

    expect(document.documentElement.getAttribute('data-chat-composer-focus')).toBe('true');

    const sendButton = screen.getByRole('button', { name: '보내기' });

    fireEvent.blur(textarea, { relatedTarget: sendButton });
    sendButton.focus();

    expect(sendButton).toHaveFocus();

    await act(async () => {
      fireEvent.click(sendButton);
      await flushPromises();
    });

    expect(textarea).toHaveFocus();
    expect(document.documentElement.getAttribute('data-chat-composer-focus')).toBe('true');
  });

  it('disables send and shows a countdown during the local cooldown', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 1,
    });

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    fireEvent.change(screen.getByPlaceholderText('메시지를 입력하세요.'), {
      target: { value: 'hello world' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(screen.getByRole('button', { name: '5초 대기' })).toBeDisabled();
    expect(screen.getByText('채팅 흐름을 위해 5초 후에 다시 보낼 수 있어요.')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await flushPromises();
    });

    expect(screen.getByRole('button', { name: '보내기' })).toBeEnabled();
  });

  it('shows a friendly duplicate feedback message when the backend rejects the send', async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue(new CommentSubmissionError('duplicate'));

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    fireEvent.change(screen.getByPlaceholderText('메시지를 입력하세요.'), {
      target: { value: 'hello world' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(screen.getByText('같은 메시지는 30초 후에 다시 보낼 수 있어요.')).toBeInTheDocument();
  });

  it('keeps the cooldown UI when switching videos because chat is global', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      id: 1,
    });

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    const { rerender } = render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    fireEvent.change(screen.getByPlaceholderText('메시지를 입력하세요.'), {
      target: { value: 'hello world' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(screen.getByRole('button', { name: '5초 대기' })).toBeDisabled();

    rerender(<CommentSection videoId="video-2" videoTitle="Other video" />);

    expect(screen.getByRole('button', { name: '5초 대기' })).toBeDisabled();
    expect(screen.getByText('채팅 흐름을 위해 5초 후에 다시 보낼 수 있어요.')).toBeInTheDocument();
  });

  it('renders the global chat even before a video is selected', () => {
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection />);

    expect(screen.getByRole('heading', { name: '전체 채팅방' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('메시지를 입력하세요.')).toBeInTheDocument();
  });

  it('shows the active participant count when presence data is available', () => {
    useCommentsMock.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      presenceQuery: {
        data: {
          active_count: 7,
        },
      },
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection />);

    expect(screen.getByText('실시간 7명')).toBeInTheDocument();
  });

  it('renders public YouTube comment highlights as regular chat messages', () => {
    useVideoCommentHighlightsMock.mockReturnValue({
      data: [commentHighlight('video-1', '이 부분 설명 진짜 좋네요')],
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(
      <CommentSection
        availableTitles={[selectedTitle]}
        videoId="video-1"
        videoTitle="Test video"
      />,
    );

    expect(useVideoCommentHighlightsMock).toHaveBeenCalledWith('video-1', true);
    expect(screen.getByText('YouTube Viewer')).toBeInTheDocument();
    expect(screen.queryByText('@YouTube Viewer')).not.toBeInTheDocument();
    expect(screen.queryByText('인기 댓글')).not.toBeInTheDocument();
    expect(screen.getByText('이 부분 설명 진짜 좋네요')).toBeInTheDocument();
    expect(screen.getByText('Atlas Sniper')).toHaveAttribute('data-grade', 'RARE');
    const titleBadge = screen.getByText('Atlas Sniper').closest('.comment-message__title-badge');

    expect(titleBadge).toHaveAttribute('data-grade', 'RARE');
    expect(titleBadge?.previousElementSibling).toHaveClass('comment-message__author');
    expect(screen.getByText('YouTube Viewer').closest('.comment-message__identity')).toHaveAttribute(
      'data-tier-code',
    );
  });

  it('shows the backend title on public highlights for anonymous users', () => {
    useAuthMock.mockReturnValue({
      accessToken: null,
      logout: vi.fn(),
      status: 'anonymous',
      user: null,
    });
    useVideoCommentHighlightsMock.mockReturnValue({
      data: [commentHighlight('video-1', '비로그인도 보는 댓글')],
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    const author = screen.getByText('YouTube Viewer');

    expect(author.closest('.comment-message__identity')).toHaveAttribute('data-title-grade');
    expect(author.parentElement?.querySelector('.comment-message__title-badge')).toHaveTextContent(
      'Atlas Sniper',
    );
  });

  it('resets public comment highlights when the selected video changes', () => {
    const firstHighlights = [commentHighlight('video-1', '첫 번째 영상 댓글')];
    const secondHighlights = [commentHighlight('video-2', '두 번째 영상 댓글')];

    useVideoCommentHighlightsMock.mockImplementation((videoId: string) => ({
      data: videoId === 'video-1' ? firstHighlights : secondHighlights,
    }));
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    const { rerender } = render(<CommentSection videoId="video-1" videoTitle="First" />);

    expect(screen.getByText('첫 번째 영상 댓글')).toBeInTheDocument();

    rerender(<CommentSection videoId="video-2" videoTitle="Second" />);

    expect(screen.queryByText('첫 번째 영상 댓글')).not.toBeInTheDocument();
    expect(screen.getByText('두 번째 영상 댓글')).toBeInTheDocument();
  });

  it('shows participant names in the presence hover panel', () => {
    useCommentsMock.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      presenceQuery: {
        data: {
          active_count: 2,
          participants: [
            {
              display_name: 'Atlas User',
              participant_id: 'participant-1',
            },
            {
              display_name: '익명 #nt-2',
              participant_id: 'participant-2',
            },
          ],
        },
      },
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection />);

    const presencePanel = screen.getByLabelText('참여 2명');

    expect(presencePanel).toBeInTheDocument();
    expect(within(presencePanel).getByText('Atlas User')).toBeInTheDocument();
    expect(within(presencePanel).getByText('익명 #nt-2')).toBeInTheDocument();
  });

  it('marks messages from the authenticated user as own even when the client id differs', () => {
    useAuthMock.mockReturnValue({
      logout: vi.fn(),
      status: 'authenticated',
      user: {
        displayName: 'Atlas User',
        email: 'atlas@example.com',
        id: 7,
        pictureUrl: null,
      },
    });
    useCommentsMock.mockReturnValue({
      data: [
        {
          author: 'Atlas User',
          client_id: 'other-device-client',
          content: '다른 기기에서 보낸 메시지',
          created_at: '2026-03-22T00:00:00.000Z',
          id: 1,
          user_id: 7,
          video_id: 'global',
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection />);

    expect(screen.getByText('나')).toBeInTheDocument();
    expect(screen.getByText('다른 기기에서 보낸 메시지')).toBeInTheDocument();
    expect(screen.getByText(/9:00/)).toBeInTheDocument();
    expect(screen.queryByText(/3\. 22\./)).not.toBeInTheDocument();
  });

  it('marks author nicknames with the message tier code', () => {
    useCommentsMock.mockReturnValue({
      data: [
        {
          author: 'Gold User',
          client_id: 'client-gold',
          content: '골드 티어 메시지',
          created_at: '2026-03-22T00:00:00.000Z',
          current_tier_code: 'GOLD',
          id: 1,
          selectedAchievementTitle: selectedTitle,
          user_id: 8,
          video_id: 'global',
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection regionCode="KR" />);

    const identity = screen.getByText('Gold User').closest('.comment-message__identity');
    const titleBadge = identity?.querySelector('.comment-message__title-badge');
    const titleStar = identity?.querySelector('.comment-message__title-star');

    expect(identity).toHaveAttribute('data-tier-code', 'GOLD');
    expect(identity).toHaveTextContent(/Gold User\s*Atlas Sniper/);
    expect(titleBadge).toHaveAttribute('data-grade', 'RARE');
    expect(titleStar).toHaveAttribute('data-grade', 'RARE');
    expect(titleStar).toHaveTextContent('★');
  });

  it('falls back to the current user tier for own messages without tier data', () => {
    useAuthMock.mockReturnValue({
      logout: vi.fn(),
      status: 'authenticated',
      user: {
        displayName: 'Atlas User',
        email: 'atlas@example.com',
        id: 7,
        pictureUrl: null,
        selectedTitle,
      },
    });
    useCommentsMock.mockReturnValue({
      data: [
        {
          author: 'Atlas User',
          client_id: 'other-device-client',
          content: '내 티어 색 메시지',
          created_at: '2026-03-22T00:00:00.000Z',
          id: 1,
          user_id: 7,
          video_id: 'global',
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection currentTierCode="DIAMOND" regionCode="KR" />);

    const identity = screen.getByText('나').closest('.comment-message__identity');

    expect(identity).toHaveAttribute('data-tier-code', 'DIAMOND');
    expect(identity).toHaveTextContent(/나\s*Atlas Sniper/);
  });

  it('hides trade system messages from the chat list', () => {
    useCommentsMock.mockReturnValue({
      data: [
        {
          author: '시스템',
          client_id: 'system:login',
          content: 'Atlas User님이 로그인했습니다.',
          created_at: '2026-03-22T00:00:00.000Z',
          id: 1,
          message_type: 'SYSTEM',
          system_event_type: 'LOGIN',
          user_id: null,
          video_id: 'global',
        },
        {
          author: '시스템',
          client_id: 'system:trade',
          content: 'Atlas User님이 [Title] 1개를 매수했습니다. (7500P)',
          created_at: '2026-03-22T00:00:01.000Z',
          id: 2,
          message_type: 'SYSTEM',
          system_event_type: 'TRADE',
          user_id: null,
          video_id: 'global',
        },
        {
          author: '시스템',
          client_id: 'system:trade',
          content: 'Atlas User님이 [Title] 1개를 매도했습니다. (8200P)',
          created_at: '2026-03-22T00:00:02.000Z',
          id: 3,
          message_type: 'SYSTEM',
          system_event_type: 'TRADE',
          user_id: null,
          video_id: 'global',
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
    });
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection />);

    expect(screen.getByText('Atlas User님이 로그인했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('Atlas User님이 [Title] 1개를 매수했습니다. (7500P)')).not.toBeInTheDocument();
    expect(screen.queryByText('Atlas User님이 [Title] 1개를 매도했습니다. (8200P)')).not.toBeInTheDocument();
  });

  it('marks the document while the mobile composer is focused and clears it on blur', () => {
    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    const textarea = screen.getByPlaceholderText('메시지를 입력하세요.');

    fireEvent.focus(textarea);

    expect(document.documentElement.getAttribute('data-chat-composer-focus')).toBe('true');

    fireEvent.blur(textarea);

    act(() => {
      vi.runAllTimers();
    });

    expect(document.documentElement.hasAttribute('data-chat-composer-focus')).toBe(false);
  });

  it('shows the composer on mobile', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: '(max-width: 768px)',
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    useCreateCommentMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<CommentSection videoId="video-1" videoTitle="Test video" />);

    expect(screen.getByPlaceholderText('메시지를 입력하세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보내기' })).toBeInTheDocument();
  });
});
