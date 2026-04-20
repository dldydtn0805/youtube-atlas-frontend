import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameCoinTierProgress } from '../../../features/game/types';
import GameDividendModal from './GameDividendModal';

const tierProgress: GameCoinTierProgress = {
  coinBalance: 0,
  currentTier: {
    badgeCode: 'BRONZE',
    displayName: '브론즈',
    minCoinBalance: 0,
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

describe('GameDividendModal', () => {
  it('shows highlight tier guidance in the tier modal', () => {
    render(<GameDividendModal isOpen onClose={() => undefined} tierProgress={tierProgress} />);

    expect(screen.getByRole('heading', { name: '티어' })).toBeInTheDocument();
    expect(screen.getByText('하이라이트 티어 기준')).toBeInTheDocument();
    expect(screen.getByText('하이라이트 점수로 티어가 정해집니다')).toBeInTheDocument();
  });
});
