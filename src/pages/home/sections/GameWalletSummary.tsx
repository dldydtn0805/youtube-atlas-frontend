import type { GameCurrentSeason } from '../../../features/game/types';
import {
  formatFullPoints,
  formatPoints,
  getPointTone,
} from '../gameHelpers';
import { formatSignedProfitRate } from '../utils';

const walletRefreshTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  hour12: false,
  minute: '2-digit',
});

function formatSignedPoints(points?: number | null) {
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    return '집계 중';
  }

  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  if (points < 0) {
    return `-${formatPoints(Math.abs(points))}`;
  }

  return '0P';
}

function formatWalletUpdatedLabel(updatedAt?: number) {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return null;
  }

  return `${walletRefreshTimeFormatter.format(new Date(updatedAt))} 갱신`;
}

interface GameWalletSummaryProps {
  computedWalletTotalAssetPoints: number | null;
  currentTierCode?: string | null;
  openPositionsBuyPoints: number;
  openPositionsEvaluationPoints: number;
  openPositionsProfitPoints: number;
  season?: GameCurrentSeason;
  walletUpdatedAt?: number;
}

export default function GameWalletSummary({
  computedWalletTotalAssetPoints,
  currentTierCode,
  openPositionsBuyPoints,
  openPositionsEvaluationPoints,
  openPositionsProfitPoints,
  season,
  walletUpdatedAt,
}: GameWalletSummaryProps) {
  const profitPointsTone = getPointTone(openPositionsProfitPoints);
  const walletUpdatedLabel = season ? formatWalletUpdatedLabel(walletUpdatedAt) : null;

  return (
    <section
      className="app-shell__game-wallet"
      aria-label="지갑 현황"
      data-current-tier={currentTierCode ?? undefined}
    >
      <div className="app-shell__game-wallet-copy">
        <div className="app-shell__game-wallet-copy-main">
          <p className="app-shell__game-wallet-eyebrow">Wallet</p>
          <h4 className="app-shell__game-wallet-title">지갑</h4>
        </div>
        {walletUpdatedLabel ? (
          <p className="app-shell__game-wallet-status" aria-label={`최근 갱신 시각 ${walletUpdatedLabel}`}>
            {walletUpdatedLabel}
          </p>
        ) : null}
      </div>
      <div className="app-shell__game-panel-metrics">
        <span className="app-shell__game-panel-metric app-shell__game-panel-metric--hero">
          <span className="app-shell__game-panel-metric-label">잔액</span>
          <span
            className="app-shell__game-panel-metric-value"
            title={season ? formatFullPoints(season.wallet.balancePoints) : undefined}
          >
            {season ? formatPoints(season.wallet.balancePoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">즉시 매수 가능 포인트</span>
        </span>
        <span className="app-shell__game-panel-metric app-shell__game-panel-metric--hero">
          <span className="app-shell__game-panel-metric-label">총자산</span>
          <span
            className="app-shell__game-panel-metric-value"
            title={
              computedWalletTotalAssetPoints !== null
                ? formatFullPoints(computedWalletTotalAssetPoints)
                : undefined
            }
          >
            {computedWalletTotalAssetPoints !== null ? formatPoints(computedWalletTotalAssetPoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">잔액 + 현재 평가 금액</span>
        </span>
        <span className="app-shell__game-panel-metric">
          <span className="app-shell__game-panel-metric-label">손익률</span>
          <span className="app-shell__game-panel-metric-value" data-tone={profitPointsTone}>
            {season ? formatSignedProfitRate(openPositionsProfitPoints, openPositionsBuyPoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">현재 평가 기준 수익률</span>
        </span>
        <span className="app-shell__game-panel-metric">
          <span className="app-shell__game-panel-metric-label">평가 손익</span>
          <span className="app-shell__game-panel-metric-value" data-tone={profitPointsTone}>
            {season ? formatSignedPoints(openPositionsProfitPoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">현재 평가 금액 - 총 매수 금액</span>
        </span>
        <span className="app-shell__game-panel-metric">
          <span className="app-shell__game-panel-metric-label">총 매수 금액</span>
          <span
            className="app-shell__game-panel-metric-value"
            title={season ? formatFullPoints(openPositionsBuyPoints) : undefined}
          >
            {season ? formatPoints(openPositionsBuyPoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">현재 보유 영상 매수 금액</span>
        </span>
        <span className="app-shell__game-panel-metric">
          <span className="app-shell__game-panel-metric-label">총 평가 금액</span>
          <span
            className="app-shell__game-panel-metric-value"
            title={season ? formatFullPoints(openPositionsEvaluationPoints) : undefined}
          >
            {season ? formatPoints(openPositionsEvaluationPoints) : '-'}
          </span>
          <span className="app-shell__game-panel-metric-meta">최신 시세 기준 평가</span>
        </span>
      </div>
    </section>
  );
}
