import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders projected balance summary items in the modal', () => {
    render(
      <GameTradeModal
        confirmLabel="매도"
        currentRankLabel="3위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={200}
        mode="sell"
        onChangeQuantity={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        summaryItems={[
          { label: '정산 금액', value: '900P' },
          { label: '거래 후 잔액', value: '10,900P' },
        ]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    expect(screen.getByText('거래 후 잔액')).toBeInTheDocument();
    expect(screen.getByText('10,900P')).toBeInTheDocument();
  });

  it('switches to scheduled sell mode from the mode buttons', () => {
    const onChangeSellOrderMode = vi.fn();

    render(
      <GameTradeModal
        confirmLabel="매도"
        currentRankLabel="3위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={200}
        mode="sell"
        onChangeQuantity={vi.fn()}
        onChangeSellOrderMode={onChangeSellOrderMode}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '예약 매도' }));

    expect(onChangeSellOrderMode).toHaveBeenCalledWith('scheduled');
  });

  it('switches from scheduled sell mode back to instant mode from the mode buttons', () => {
    const onChangeSellOrderMode = vi.fn();

    render(
      <GameTradeModal
        confirmLabel="매도"
        currentRankLabel="3위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={200}
        mode="sell"
        onChangeQuantity={vi.fn()}
        onChangeSellOrderMode={onChangeSellOrderMode}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        sellOrderMode="scheduled"
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '즉시 매도' }));

    expect(onChangeSellOrderMode).toHaveBeenCalledWith('instant');
  });

  it('closes when the modal header is swiped down on touch', () => {
    const onClose = vi.fn();
    render(
      <GameTradeModal
        confirmLabel="매도"
        currentRankLabel="3위"
        helperText="테스트"
        isOpen
        isSubmitting={false}
        maxQuantity={200}
        mode="sell"
        onChangeQuantity={vi.fn()}
        onClose={onClose}
        onConfirm={vi.fn()}
        quantity={100}
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    const header = document.querySelector('.app-shell__modal-header');

    expect(header).not.toBeNull();

    fireEvent.pointerDown(header as Element, { clientX: 40, clientY: 20, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(header as Element, { clientX: 46, clientY: 112, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(header as Element, { clientX: 46, clientY: 112, pointerId: 1, pointerType: 'touch' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
