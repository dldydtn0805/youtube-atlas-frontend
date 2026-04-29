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
    expect(getGameTradeQuickActions(1000)[0]).toEqual({ label: '10%', quantity: 100 });
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

  it('includes 5th place in scheduled sell quick rank actions', () => {
    const onChangeScheduledSellTargetRank = vi.fn();

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
        onChangeScheduledSellTargetRank={onChangeScheduledSellTargetRank}
        onChangeScheduledSellTriggerDirection={vi.fn()}
        onChangeSellOrderMode={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        sellOrderMode="scheduled"
        summaryItems={[{ label: '처리 방식', value: '조건 도달 시 자동 매도' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '5위' }));

    expect(onChangeScheduledSellTargetRank).toHaveBeenCalledWith(5);
  });

  it('closes when the modal header is swiped down on touch', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    try {
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
      const modal = document.querySelector('.app-shell__modal');

      expect(header).not.toBeNull();
      expect(modal).not.toBeNull();

      fireEvent.pointerDown(header as Element, { clientX: 40, clientY: 20, pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerMove(header as Element, { clientX: 56, clientY: 460, pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerUp(header as Element, { clientX: 56, clientY: 460, pointerId: 1, pointerType: 'touch' });
      vi.advanceTimersByTime(16);

      expect(onClose).not.toHaveBeenCalled();
      expect((modal as HTMLElement).style.transform).toContain('translate3d');

      vi.advanceTimersByTime(220);

      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes when the modal body is pulled down from the top on touch', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    try {
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

      const body = document.querySelector('.app-shell__modal-body');
      const modal = document.querySelector('.app-shell__modal');

      expect(body).not.toBeNull();
      expect(modal).not.toBeNull();

      fireEvent.touchStart(body as Element, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(body as Element, { touches: [{ clientX: 42, clientY: 90, identifier: 1 }] });
      fireEvent.touchMove(body as Element, { touches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      fireEvent.touchEnd(body as Element, { changedTouches: [{ clientX: 48, clientY: 450, identifier: 1 }] });

      expect(onClose).not.toHaveBeenCalled();
      expect((modal as HTMLElement).style.transform).toContain('translate3d');
      expect((modal as HTMLElement).style.transition).toContain('330ms');

      vi.advanceTimersByTime(330);

      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps scrolling when the modal body is not at the top', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    try {
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

      const body = document.querySelector('.app-shell__modal-body') as HTMLElement | null;

      expect(body).not.toBeNull();

      Object.defineProperty(body, 'scrollTop', { configurable: true, value: 24 });

      fireEvent.touchStart(body as Element, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(body as Element, { touches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      fireEvent.touchEnd(body as Element, { changedTouches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      vi.advanceTimersByTime(220);

      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not close when the modal header is only dragged a short distance on touch', () => {
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

    fireEvent.pointerDown(header as Element, { clientX: 40, clientY: 20, pointerId: 4, pointerType: 'touch' });
    fireEvent.pointerMove(header as Element, { clientX: 52, clientY: 150, pointerId: 4, pointerType: 'touch' });
    fireEvent.pointerUp(header as Element, { clientX: 52, clientY: 150, pointerId: 4, pointerType: 'touch' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns to the original position when the modal is opened again', () => {
    vi.useFakeTimers();
    const { rerender } = render(
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
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    const header = document.querySelector('.app-shell__modal-header');

    expect(header).not.toBeNull();

    rerender(
      <GameTradeModal
        confirmLabel="매도"
        currentRankLabel="3위"
        helperText="테스트"
        isOpen={false}
        isSubmitting={false}
        maxQuantity={200}
        mode="sell"
        onChangeQuantity={vi.fn()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        quantity={100}
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    rerender(
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
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    const reopenedModal = document.querySelector('.app-shell__modal');

    expect(reopenedModal).not.toBeNull();
    expect((reopenedModal as HTMLElement).style.transform).toBe('');
    vi.useRealTimers();
  });

  it('slides the modal down without fading it while dragging down on touch', () => {
    vi.useFakeTimers();
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
        summaryItems={[{ label: '정산 금액', value: '900P' }]}
        thumbnailUrl={null}
        title="테스트 영상"
        unitPointsLabel="1,000P"
      />,
    );

    const header = document.querySelector('.app-shell__modal-header');
    const modal = document.querySelector('.app-shell__modal');

    expect(header).not.toBeNull();
    expect(modal).not.toBeNull();

    fireEvent.pointerDown(header as Element, { clientX: 40, clientY: 20, pointerId: 3, pointerType: 'touch' });
    fireEvent.pointerMove(header as Element, { clientX: 56, clientY: 220, pointerId: 3, pointerType: 'touch' });

    expect((modal as HTMLElement).style.opacity).toBe('');
    vi.useRealTimers();
  });

  it('does not close when the modal header is dragged down with a mouse', () => {
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

    fireEvent.pointerDown(header as Element, { button: 0, clientX: 40, clientY: 20, pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerMove(header as Element, { clientX: 56, clientY: 460, pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerUp(header as Element, { clientX: 56, clientY: 460, pointerId: 2, pointerType: 'mouse' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
