import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameCoinOverview } from '../../../features/game/types';
import GameDividendModal from './GameDividendModal';

function coinOverview(rankCount: number): GameCoinOverview {
  return {
    eligibleRankCutoff: rankCount,
    minimumHoldSeconds: 600,
    myActiveProducerCount: 0,
    myCoinBalance: 0,
    myEstimatedCoinYield: 0,
    myWarmingUpPositionCount: 0,
    positions: [],
    ranks: Array.from({ length: rankCount }, (_, index) => ({
      coinRatePercent: rankCount - index,
      rank: index + 1,
    })),
  };
}

describe('GameDividendModal', () => {
  it('samples coin rate examples from the backend rank list instead of fixed ranks', () => {
    render(<GameDividendModal isOpen onClose={() => undefined} overview={coinOverview(8)} />);

    const examples = within(screen.getByLabelText('대표 순위별 코인 채굴률 예시'));

    expect(examples.getByText('1위')).toBeInTheDocument();
    expect(examples.getByText('2위')).toBeInTheDocument();
    expect(examples.getByText('4위')).toBeInTheDocument();
    expect(examples.getByText('5위')).toBeInTheDocument();
    expect(examples.getByText('7위')).toBeInTheDocument();
    expect(examples.getByText('8위')).toBeInTheDocument();
    expect(examples.queryByText('10위')).not.toBeInTheDocument();
    expect(examples.queryByText('50위')).not.toBeInTheDocument();
  });
});
