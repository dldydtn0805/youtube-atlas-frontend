import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommunityPanel } from './ContentPanels';

vi.mock('../../../components/CommentSection/CommentSection', () => ({
  default: ({ videoTitle }: { videoTitle?: string }) => (
    <div data-testid="comment-section">{videoTitle ?? 'comment section'}</div>
  ),
}));

describe('CommunityPanel', () => {
  it('can collapse and expand the live chat panel', () => {
    render(<CommunityPanel selectedVideoId="video-1" selectedVideoTitle="Chat Room" />);

    expect(screen.getByTestId('comment-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실시간 채팅 숨기기' }));

    expect(screen.queryByTestId('comment-section')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실시간 채팅 펼치기' }));

    expect(screen.getByTestId('comment-section')).toBeInTheDocument();
  });
});
