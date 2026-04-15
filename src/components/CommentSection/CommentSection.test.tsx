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
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T00:00:00.000Z'));
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

  it('resets the cooldown UI when switching to a different room', async () => {
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

    expect(screen.getByRole('button', { name: '보내기' })).toBeEnabled();
    expect(
      screen.queryByText('채팅 흐름을 위해 5초 후에 다시 보낼 수 있어요.'),
    ).not.toBeInTheDocument();
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
});
