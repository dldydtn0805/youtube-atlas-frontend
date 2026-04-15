import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameTradeModal, { getGameTradeQuickActions } from './GameTradeModal';

describe('GameTradeModal', () => {
  it('prefers the most specific surviving quick-action label when quantities overlap', () => {
    expect(getGameTradeQuickActions(100)).toEqual([{ label: '100%', quantity: 100 }]);
    expect(getGameTradeQuickActions(200)).toEqual([
      { label: '50%', quantity: 100 },
      { label: '100%', quantity: 200 },
    ]);
  });

  it('renders whole-share quantity guidance in the modal', () => {
    render(
      <GameTradeModal
        confirmLabel="매수"
        currentRankLabel="1위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={100}
        mode="buy"
        onChangeQuantity={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        summaryItems={[{ label: '수량', value: '1개' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="100P"
      />,
    );

    expect(screen.getByRole('button', { name: '100%' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '25%' })).not.toBeInTheDocument();
    expect(screen.getByText(/1개 단위로만 주문할 수 있습니다/)).toBeInTheDocument();
  });
});
