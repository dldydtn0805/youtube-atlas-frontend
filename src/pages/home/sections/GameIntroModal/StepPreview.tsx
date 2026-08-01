import type { GameIntroPreviewType } from './steps';
import './preview.css';

interface StepPreviewProps {
  type: GameIntroPreviewType;
}

function WalletPreview() {
  return (
    <div className="app-shell__game-intro-preview app-shell__game-intro-preview--wallet" aria-hidden="true">
      <div className="app-shell__game-intro-metric">
        <span>시작 포인트</span>
        <strong>100,000P</strong>
      </div>
      <div className="app-shell__game-intro-rule-chips">
        <span>다른 영상 여러 개</span>
        <span>같은 영상 1개</span>
      </div>
    </div>
  );
}

function MarketPreview() {
  return (
    <div className="app-shell__game-intro-preview app-shell__game-intro-preview--market" aria-hidden="true">
      <div className="app-shell__game-intro-market-row">
        <span>현재 순위 기본가</span>
        <strong>500,000P</strong>
      </div>
      <div className="app-shell__game-intro-market-counts">
        <span data-tone="buy">구매 3회</span>
        <span data-tone="sell">판매 1회</span>
        <strong>가격 +2%</strong>
      </div>
    </div>
  );
}

function SellPreview() {
  return (
    <div className="app-shell__game-intro-preview app-shell__game-intro-preview--sell" aria-hidden="true">
      <span className="app-shell__game-intro-sync-card">현재 순위<br /><strong>1개 매수</strong></span>
      <span className="app-shell__game-intro-sync-arrow">→</span>
      <span className="app-shell__game-intro-sync-card" data-active="true">순위 갱신 후<br /><strong>전량 매도</strong></span>
    </div>
  );
}

function AssetsPreview() {
  return (
    <div className="app-shell__game-intro-preview app-shell__game-intro-preview--assets" aria-hidden="true">
      <div className="app-shell__game-intro-assets-formula">
        <span>현금</span><b>+</b><span>영상 평가액</span><b>+</b><span>예약 포인트</span>
      </div>
      <div className="app-shell__game-intro-metric">
        <span>티어 기준 총자산</span>
        <strong>1,240,000P</strong>
      </div>
    </div>
  );
}

export default function StepPreview({ type }: StepPreviewProps) {
  if (type === 'market') {
    return <MarketPreview />;
  }

  if (type === 'sell') {
    return <SellPreview />;
  }

  if (type === 'assets') {
    return <AssetsPreview />;
  }

  return <WalletPreview />;
}
