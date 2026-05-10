import './SellOrderModeTabs.css';

interface SellOrderModeTabsProps {
  isScheduledSellMode: boolean;
  isSubmitting: boolean;
  onChangeSellOrderMode?: (mode: 'instant' | 'scheduled') => void;
}

export default function SellOrderModeTabs({
  isScheduledSellMode,
  isSubmitting,
  onChangeSellOrderMode,
}: SellOrderModeTabsProps) {
  return (
    <div className="app-shell__sell-order-tabs" aria-label="매도 방식">
      <button
        aria-pressed={!isScheduledSellMode}
        data-active={!isScheduledSellMode}
        disabled={isSubmitting}
        onClick={() => onChangeSellOrderMode?.('instant')}
        type="button"
      >
        즉시 매도
      </button>
      <button
        aria-pressed={isScheduledSellMode}
        data-active={isScheduledSellMode}
        disabled={isSubmitting}
        onClick={() => onChangeSellOrderMode?.('scheduled')}
        type="button"
      >
        예약 매도
      </button>
    </div>
  );
}
