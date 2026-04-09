import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameTradeModal, { getGameTradeQuickActions } from './GameTradeModal';

describe('GameTradeModal', () => {
  it('prefers the most specific surviving quick-action label when quantities overlap', () => {
    expect(getGameTradeQuickActions(1)).toEqual([{ label: '100%', quantity: 1 }]);
    expect(getGameTradeQuickActions(2)).toEqual([
      { label: '50%', quantity: 1 },
      { label: '100%', quantity: 2 },
    ]);
  });

  it('renders the relabeled quick actions in the modal', () => {
    render(
      <GameTradeModal
        confirmLabel="매수"
        currentRankLabel="1위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={1}
        mode="buy"
        onChangeQuantity={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={1}
        summaryItems={[{ label: '수량', value: '0.01개' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="100P"
      />,
    );

    expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '25%' })).not.toBeInTheDocument();
  });
});
