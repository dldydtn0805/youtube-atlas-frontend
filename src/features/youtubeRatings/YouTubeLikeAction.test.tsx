import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import YouTubeLikeAction from './YouTubeLikeAction';

describe('YouTubeLikeAction', () => {
  it('shows an account-backed pressed state and toggles it', () => {
    const onToggle = vi.fn();

    render(
      <YouTubeLikeAction
        authStatus="authenticated"
        isLiked
        isPending={false}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByRole('button', { name: 'YouTube 좋아요 취소' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('requires Google login before liking a YouTube video', () => {
    render(
      <YouTubeLikeAction
        authStatus="anonymous"
        isLiked={false}
        isPending={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'YouTube 계정으로 좋아요' })).toBeDisabled();
  });
});
