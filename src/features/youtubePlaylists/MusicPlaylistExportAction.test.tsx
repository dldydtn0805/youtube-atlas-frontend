import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { YouTubeVideoItem } from '../youtube/types';
import MusicPlaylistExportAction from './MusicPlaylistExportAction';

const musicPlaylistExportHookMock = vi.fn();

vi.mock('./useMusicPlaylistExport', () => ({
  default: (...args: unknown[]) => musicPlaylistExportHookMock(...args),
}));

describe('MusicPlaylistExportAction', () => {
  const startExport = vi.fn();
  const item = { id: 'video-1' } as YouTubeVideoItem;

  beforeEach(() => {
    startExport.mockReset();
    musicPlaylistExportHookMock.mockReturnValue({
      exportLimit: 20,
      startExport,
      state: {
        message: null,
        phase: 'idle',
        requestedCount: 0,
        result: null,
      },
    });
  });

  it('starts an export for the visible music chart', () => {
    render(
      <MusicPlaylistExportAction
        isVisible
        items={[item]}
        onRestoreMusicView={vi.fn()}
        regionCode="KR"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'YouTube TOP 1 담기' }));

    expect(startExport).toHaveBeenCalledWith([item], 'KR');
  });

  it('links to the created playlist after partial completion', () => {
    musicPlaylistExportHookMock.mockReturnValue({
      exportLimit: 20,
      startExport,
      state: {
        message: '19/20개를 담았습니다.',
        phase: 'partial',
        requestedCount: 20,
        result: {
          playlistUrl: 'https://www.youtube.com/playlist?list=playlist-1',
        },
      },
    });

    render(
      <MusicPlaylistExportAction
        isVisible
        items={[item]}
        onRestoreMusicView={vi.fn()}
        regionCode="KR"
      />,
    );

    expect(screen.getByText('19/20개를 담았습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'YouTube에서 열기' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/playlist?list=playlist-1',
    );
  });
});
