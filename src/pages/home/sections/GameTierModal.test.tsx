import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameTierProgress } from '../../../features/game/types';
import GameTierModal from './GameTierModal';

const tierProgress: GameTierProgress = {
  currentTier: {
    badgeCode: 'BRONZE',
    displayName: '브론즈',
    minScore: 0,
    profileThemeCode: 'BRONZE',
    tierCode: 'BRONZE',
    titleCode: 'BRONZE',
  },
  highlightScore: 1200,
  nextTier: null,
  regionCode: 'KR',
  seasonId: 1,
  seasonName: '테스트 시즌',
  tiers: [],
};

describe('GameTierModal', () => {
  it('shows a tier card loading overlay while tier progress is loading', () => {
    render(<GameTierModal isOpen isTierProgressLoading onClose={() => undefined} />);

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('티어 카드 불러오는 중').length).toBeGreaterThan(0);
  });

  it('shows highlight tier guidance in the tier modal', () => {
    render(<GameTierModal isOpen onClose={() => undefined} tierProgress={tierProgress} />);

    expect(screen.getByRole('heading', { name: '티어' })).toBeInTheDocument();
    expect(screen.getAllByText('하이라이트 티어 기준').length).toBeGreaterThan(0);
    expect(screen.getAllByText('하이라이트 점수로 티어가 정해집니다').length).toBeGreaterThan(0);
  });

  it('shows the highlights tab when highlight content is provided', () => {
    render(
      <GameTierModal
        highlightsContent={<div>하이라이트 목록</div>}
        isOpen
        onClose={() => undefined}
        tierProgress={tierProgress}
      />,
    );

    expect(screen.getByRole('tab', { name: '하이라이트' })).toBeInTheDocument();
  });

  it('moves to the next tab when the modal panel is swiped left', () => {
    render(
      <GameTierModal
        highlightsContent={<div>하이라이트 목록</div>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    const panel = screen.getByRole('tabpanel');

    fireEvent.pointerDown(panel, { clientX: 220, clientY: 32, pointerId: 1 });
    fireEvent.pointerMove(panel, { clientX: 120, clientY: 36, pointerId: 1 });
    fireEvent.pointerUp(panel, { clientX: 120, clientY: 36, pointerId: 1 });

    expect(screen.getAllByText('하이라이트 목록').length).toBeGreaterThan(0);
  });

  it('wraps from the first tab to the last tab on swipe right', () => {
    render(
      <GameTierModal
        highlightsContent={<div>하이라이트 목록</div>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    const panel = screen.getByRole('tabpanel');

    fireEvent.pointerDown(panel, { clientX: 120, clientY: 32, pointerId: 2 });
    fireEvent.pointerMove(panel, { clientX: 220, clientY: 36, pointerId: 2 });
    fireEvent.pointerUp(panel, { clientX: 220, clientY: 36, pointerId: 2 });

    expect(screen.getAllByText('랭킹 목록').length).toBeGreaterThan(0);
  });

  it('still clicks buttons inside a panel without triggering a swipe', () => {
    const onPanelButtonClick = vi.fn();

    render(
      <GameTierModal
        highlightsContent={<button onClick={onPanelButtonClick} type="button">하이라이트 액션</button>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '하이라이트' }));
    fireEvent.click(screen.getByRole('button', { name: '하이라이트 액션' }));

    expect(onPanelButtonClick).toHaveBeenCalledTimes(1);
  });

  it('can start a swipe from a button inside a panel', () => {
    render(
      <GameTierModal
        highlightsContent={<button type="button">하이라이트 액션</button>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '하이라이트' }));

    const panelButton = screen.getByRole('button', { name: '하이라이트 액션' });

    fireEvent.pointerDown(panelButton, { clientX: 220, clientY: 32, pointerId: 3 });
    fireEvent.pointerMove(panelButton, { clientX: 120, clientY: 36, pointerId: 3 });
    fireEvent.pointerUp(panelButton, { clientX: 120, clientY: 36, pointerId: 3 });

    expect(screen.getAllByText('랭킹 목록').length).toBeGreaterThan(0);
  });

  it('closes when the modal header is swiped down on touch', () => {
    const onClose = vi.fn();
    render(
      <GameTierModal
        highlightsContent={<div>하이라이트 목록</div>}
        isOpen
        onClose={onClose}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    const header = document.querySelector('.app-shell__modal-header');

    expect(header).not.toBeNull();

    fireEvent.pointerDown(header as Element, { clientX: 64, clientY: 20, pointerId: 4, pointerType: 'touch' });
    fireEvent.pointerMove(header as Element, { clientX: 78, clientY: 460, pointerId: 4, pointerType: 'touch' });
    fireEvent.pointerUp(header as Element, { clientX: 78, clientY: 460, pointerId: 4, pointerType: 'touch' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
