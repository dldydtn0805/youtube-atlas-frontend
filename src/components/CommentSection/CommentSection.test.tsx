import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentSubmissionError } from '../../features/comments/spam';
import CommentSection from './CommentSection';

const useCommentsMock = vi.fn();
const useCreateCommentMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../lib/api', () => ({
  isApiConfigured: true,
}));

vi.mock('../../features/comments/queries', () => ({
  useComments: (...args: unknown[]) => useCommentsMock(...args),
  useCreateComment: () => useCreateCommentMock(),
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
    });
    useAuthMock.mockReturnValue({
      logout: vi.fn(),
      status: 'anonymous',
      user: null,
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

  it('restores sticky visibility markers after a successful send', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '보내기' }));
      await flushPromises();
    });

    expect(document.documentElement.hasAttribute('data-chat-composer-focus')).toBe(false);
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
