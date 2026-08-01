import type { VideoCardTradeActionState } from '../../../../components/VideoList/VideoList';

interface ChartRankingActionsProps {
  buyAriaLabel: string;
  onBuy: (triggerElement: HTMLButtonElement) => void;
  onSell: (triggerElement: HTMLButtonElement) => void;
  sellAriaLabel: string;
  state?: VideoCardTradeActionState;
}

export default function ChartRankingActions({
  buyAriaLabel,
  onBuy,
  onSell,
  sellAriaLabel,
  state,
}: ChartRankingActionsProps) {
  if (!state) {
    return null;
  }

  return (
    <span className="chart-ranking-board__trade-actions" aria-label="영상 거래">
      <button
        aria-label={buyAriaLabel}
        className="chart-ranking-board__trade-button"
        data-variant="buy"
        disabled={!state.canBuy}
        onClick={(event) => {
          event.stopPropagation();
          onBuy(event.currentTarget);
        }}
        title={state.buyTitle}
        type="button"
      >
        {state.buyLabel ?? '매수'}
      </button>
      <button
        aria-label={sellAriaLabel}
        className="chart-ranking-board__trade-button"
        data-variant="sell"
        disabled={!state.canSell}
        onClick={(event) => {
          event.stopPropagation();
          onSell(event.currentTarget);
        }}
        title={state.sellTitle}
        type="button"
      >
        매도
      </button>
    </span>
  );
}
