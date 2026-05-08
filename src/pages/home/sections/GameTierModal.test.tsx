import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameTierProgress } from '../../../features/game/types';
import GameTierModal from './GameTierModal';

const tiers: GameTierProgress['tiers'] = [
  {
    badgeCode: 'BRONZE',
    displayName: '브론즈',
    inventorySlots: 5,
    minScore: 0,
    profileThemeCode: 'BRONZE',
    tierCode: 'BRONZE',
    titleCode: 'BRONZE',
  },
  {
    badgeCode: 'SILVER',
    displayName: '실버',
    inventorySlots: 7,
    minScore: 5000,
    profileThemeCode: 'SILVER',
    tierCode: 'SILVER',
    titleCode: 'SILVER',
  },
  {
    badgeCode: 'GOLD',
    displayName: '골드',
    inventorySlots: 10,
    minScore: 10000,
    profileThemeCode: 'GOLD',
    tierCode: 'GOLD',
    titleCode: 'GOLD',
  },
];

const tierProgress: GameTierProgress = {
  currentTier: {
    badgeCode: 'BRONZE',
    displayName: '브론즈',
    inventorySlots: 5,
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
  tiers,
};

describe('GameTierModal', () => {
  it('shows a tier card loading overlay while tier progress is loading', () => {
    render(<GameTierModal isOpen isTierProgressLoading onClose={() => undefined} />);

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('티어 카드 불러오는 중').length).toBeGreaterThan(0);
  });

  it('does not force carousel slides to zero width before measurement', () => {
    render(<GameTierModal isOpen onClose={() => undefined} tierProgress={tierProgress} />);

    const track = document.querySelector<HTMLElement>('.app-shell__tier-modal-track');

    expect(track).not.toBeNull();
    expect(track?.style.getPropertyValue('--tier-modal-slide-width')).toBe('');
  });

  it('shows highlight tier guidance in the criteria tab', () => {
    render(<GameTierModal isOpen onClose={() => undefined} tierProgress={tierProgress} />);

    expect(screen.getByRole('heading', { name: '티어' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '기준' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '기준' }));

    expect(screen.getByRole('tab', { name: '기준' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('하이라이트 티어 기준')).not.toBeInTheDocument();
    expect(screen.getByText('티어별 점수 기준은 이렇습니다')).toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll('.app-shell__tier-guide-copy')).some((element) => (
        element.textContent?.includes('실버 5,000점 이상')
      )),
    ).toBe(true);
    expect(
      Array.from(document.querySelectorAll('.app-shell__tier-guide-copy')).some((element) => (
        element.textContent?.includes('30,000P면 약 24점')
      )),
    ).toBe(true);
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

  it('switches tabs when a tab button is clicked', () => {
    render(
      <GameTierModal
        highlightsContent={<div>하이라이트 목록</div>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '하이라이트' }));

    expect(screen.getAllByText('하이라이트 목록').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: '하이라이트' })).toHaveAttribute('aria-selected', 'true');
  });

  it('unmounts inactive panel content after tab transitions settle', () => {
    render(
      <GameTierModal
        highlightsContent={<div>무거운 하이라이트 목록</div>}
        isOpen
        onClose={() => undefined}
        rankingContent={<div>무거운 랭킹 목록</div>}
        tierProgress={tierProgress}
      />,
    );

    expect(screen.queryByText('무거운 하이라이트 목록')).not.toBeInTheDocument();
    expect(screen.queryByText('무거운 랭킹 목록')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '하이라이트' }));

    expect(screen.getByText('무거운 하이라이트 목록')).toBeInTheDocument();

    const track = document.querySelector('.app-shell__tier-modal-track');

    expect(track).not.toBeNull();

    fireEvent.transitionEnd(track as Element);

    expect(screen.queryByText('무거운 랭킹 목록')).not.toBeInTheDocument();
  });

  it('still clicks buttons inside a panel', () => {
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

  it('closes when the modal header is swiped down on touch', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    try {
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

      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(220);

      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
