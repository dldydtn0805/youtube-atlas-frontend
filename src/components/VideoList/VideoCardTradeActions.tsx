export interface VideoCardTradeActionState {
  canBuy: boolean;
  canSell: boolean;
  buyTitle: string;
  sellTitle: string;
}

interface VideoCardTradeActionsProps {
  buyAriaLabel: string;
  onBuy: (triggerElement: HTMLButtonElement) => void;
  onSell: (triggerElement: HTMLButtonElement) => void;
  sellAriaLabel: string;
  state?: VideoCardTradeActionState;
}

function TradeActionIcon({ direction }: { direction: 'buy' | 'sell' }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d={direction === 'buy' ? 'M12 18V6M12 6l-4 4M12 6l4 4' : 'M12 6v12M12 18l-4-4M12 18l4-4'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function VideoCardTradeActions({
  buyAriaLabel,
  onBuy,
  onSell,
  sellAriaLabel,
  state,
}: VideoCardTradeActionsProps) {
  if (!state) {
    return null;
  }

  return (
    <div className="video-card__trade-actions" aria-label="영상 거래">
      <button
        aria-label={buyAriaLabel}
        className="video-card__trade-button"
        data-variant="buy"
        disabled={!state.canBuy}
        onClick={(event) => onBuy(event.currentTarget)}
        title={state.buyTitle}
        type="button"
      >
        <TradeActionIcon direction="buy" />
        <span>매수</span>
      </button>
      <button
        aria-label={sellAriaLabel}
        className="video-card__trade-button"
        data-variant="sell"
        disabled={!state.canSell}
        onClick={(event) => onSell(event.currentTarget)}
        title={state.sellTitle}
        type="button"
      >
        <TradeActionIcon direction="sell" />
        <span>매도</span>
      </button>
    </div>
  );
}
