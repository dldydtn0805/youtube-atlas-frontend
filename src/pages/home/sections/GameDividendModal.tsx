import { createPortal } from 'react-dom';
import type { GameCoinOverview, GameCoinTierProgress } from '../../../features/game/types';
import {
  formatCoins,
  formatGameQuantity,
  formatHoldCountdown,
  formatMaybePoints,
  formatPercent,
  formatRank,
} from '../gameHelpers';
import { getFullscreenElement } from '../utils';
import GameCoinTierSummary from './GameCoinTierSummary';
import './GameDividendModal.css';

interface GameDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview?: GameCoinOverview;
  tierProgress?: GameCoinTierProgress;
}

function buildCoinRateLinePoints(overview: GameCoinOverview, width: number, height: number) {
  const paddingX = 20;
  const paddingY = 16;
  const innerWidth = Math.max(width - paddingX * 2, 1);
  const innerHeight = Math.max(height - paddingY * 2, 1);
  const maxRankIndex = Math.max(overview.ranks.length - 1, 1);
  const maxRate = Math.max(...overview.ranks.map((rank) => rank.coinRatePercent), 1);

  return overview.ranks
    .map((rank, index) => {
      const x = paddingX + (index / maxRankIndex) * innerWidth;
      const y = paddingY + (1 - rank.coinRatePercent / maxRate) * innerHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

function getRateChartY(gridIndex: number, width: number, height: number, totalGridLines: number) {
  const paddingY = 16;
  const innerHeight = Math.max(height - paddingY * 2, 1);
  const ratio = totalGridLines <= 1 ? 0 : gridIndex / (totalGridLines - 1);
  return paddingY + ratio * innerHeight;
}

function getRateChartX(rank: number, cutoff: number, width: number) {
  const paddingX = 20;
  const innerWidth = Math.max(width - paddingX * 2, 1);
  const normalizedRank = Math.max(1, Math.min(rank, cutoff));
  const ratio = cutoff <= 1 ? 0 : (normalizedRank - 1) / (cutoff - 1);
  return paddingX + ratio * innerWidth;
}

export default function GameDividendModal({ isOpen, onClose, overview, tierProgress }: GameDividendModalProps) {
  if (!isOpen || typeof document === 'undefined' || (!overview && !tierProgress)) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const chartWidth = 720;
  const chartHeight = 220;
  const linePoints = overview ? buildCoinRateLinePoints(overview, chartWidth, chartHeight) : '';
  const topRate = overview?.ranks[0]?.coinRatePercent ?? 0;
  const bottomRate = overview?.ranks[overview.ranks.length - 1]?.coinRatePercent ?? 0;
  const yAxisTicks = overview ? [topRate, Number((topRate / 2).toFixed(2)), 0] : [0, 0, 0];
  const xAxisTicks = overview
    ? [1, 50, 100, 150, overview.eligibleRankCutoff].filter(
        (rank, index, array) => rank <= overview.eligibleRankCutoff && array.indexOf(rank) === index,
      )
    : [];

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="game-dividend-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--dividend"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">시즌 코인</p>
            <h2 className="app-shell__section-title" id="game-dividend-modal-title">
              시즌 코인 상세
            </h2>
          </div>
          <button
            aria-label="시즌 코인 표 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body">
          <div className="app-shell__modal-fields">
            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">코인 현황</p>
                  <h3 className="app-shell__modal-field-title">내 코인 요약</h3>
                </div>
                <p className="app-shell__modal-field-copy">
                  Top {overview.eligibleRankCutoff} 포지션 중 {formatHoldCountdown(overview.minimumHoldSeconds)} 이상
                  보유한 포지션은 집계 시점 평가금액의 일부를 시즌 코인으로 생산합니다.
                </p>
                <div className="app-shell__game-dividend-metrics" aria-label="코인 요약">
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">보유 코인</span>
                    <strong className="app-shell__game-dividend-metric-value">
                      {formatCoins(overview.myCoinBalance)}
                    </strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">예상 생산량</span>
                    <strong className="app-shell__game-dividend-metric-value">{formatCoins(overview.myEstimatedCoinYield)}</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">생산 진행 중</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myActiveProducerCount}개</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">생산 대기</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myWarmingUpPositionCount}개</strong>
                  </span>
                </div>
                <div className="app-shell__game-dividend-rule-block" aria-label="코인 생산 로직">
                  <strong className="app-shell__game-dividend-rule-title">코인 생산 로직</strong>
                  <ul className="app-shell__game-dividend-rule-list">
                    <li>Top {overview.eligibleRankCutoff} 안에 든 포지션만 코인 생산 대상이 됩니다.</li>
                    <li>{formatHoldCountdown(overview.minimumHoldSeconds)} 이상 보유하면 생산 대기 상태에서 생산 진행 중으로 전환됩니다.</li>
                    <li>코인은 5분마다 한 번씩 적립됩니다.</li>
                    <li>적립 시점의 최신 차트와 평가금액 기준으로 코인이 계산됩니다.</li>
                    <li>예를 들어 1위는 평가금액의 {formatPercent(topRate)}, {overview.eligibleRankCutoff}위는 {formatPercent(bottomRate)}가 적립됩니다.</li>
                    <li>순위가 높을수록 적립률이 더 가파르게 올라가며, 특히 상위권일수록 보상이 크게 커집니다.</li>
                    <li>같은 5분 적립 슬롯에서는 같은 포지션이 한 번만 반영됩니다.</li>
                    <li>여러 포지션이 조건을 만족하면 생산량이 합산됩니다.</li>
                  </ul>
                </div>
              </section>
            ) : null}

            {tierProgress ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">티어 현황</p>
                  <h3 className="app-shell__modal-field-title">코인 티어 진행 현황</h3>
                </div>
                <GameCoinTierSummary progress={tierProgress} title="현재 티어" />
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">생산률</p>
                  <h3 className="app-shell__modal-field-title">Top {overview.eligibleRankCutoff} 순위별 코인 생산률</h3>
                </div>
                <div className="app-shell__game-dividend-rate-chart" aria-label="코인 생산률 그래프">
                  <div className="app-shell__game-dividend-rate-y-axis" aria-hidden="true">
                    {yAxisTicks.map((tick) => (
                      <span key={tick}>{formatPercent(tick)}</span>
                    ))}
                  </div>
                  <div className="app-shell__game-dividend-rate-plot">
                    <div className="app-shell__game-dividend-rate-badge app-shell__game-dividend-rate-badge--start">
                      <strong>1위</strong>
                      <span>{formatPercent(topRate)}</span>
                    </div>
                    <svg
                      aria-hidden="true"
                      className="app-shell__game-dividend-rate-svg"
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    >
                      <defs>
                        <linearGradient id="coin-rate-line" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stopColor="rgba(245, 158, 11, 0.95)" />
                          <stop offset="100%" stopColor="rgba(251, 191, 36, 0.65)" />
                        </linearGradient>
                      </defs>
                      {yAxisTicks.map((_, index) => {
                        const y = getRateChartY(index, chartWidth, chartHeight, yAxisTicks.length);
                        return (
                          <line
                            key={`y-grid-${index}`}
                            className="app-shell__game-dividend-rate-grid"
                            x1="20"
                            x2={chartWidth - 20}
                            y1={y}
                            y2={y}
                          />
                        );
                      })}
                      {xAxisTicks.map((rank) => {
                        const x = getRateChartX(rank, overview.eligibleRankCutoff, chartWidth);
                        return (
                          <line
                            key={`x-grid-${rank}`}
                            className="app-shell__game-dividend-rate-grid app-shell__game-dividend-rate-grid--vertical"
                            x1={x}
                            x2={x}
                            y1="16"
                            y2={chartHeight - 16}
                          />
                        );
                      })}
                      <polyline
                        className="app-shell__game-dividend-rate-line"
                        fill="none"
                        points={linePoints}
                        stroke="url(#coin-rate-line)"
                      />
                    </svg>
                    <div className="app-shell__game-dividend-rate-badge app-shell__game-dividend-rate-badge--end">
                      <strong>{overview.eligibleRankCutoff}위</strong>
                      <span>{formatPercent(bottomRate)}</span>
                    </div>
                    <div className="app-shell__game-dividend-rate-axis">
                      {xAxisTicks.map((rank) => (
                        <span key={rank}>{rank}위</span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">대상 포지션</p>
                  <h3 className="app-shell__modal-field-title">내 코인 대상 포지션</h3>
                </div>
                {overview.positions.length > 0 ? (
                  <ul className="app-shell__game-dividend-positions">
                    {overview.positions.map((position) => (
                      <li key={position.positionId} className="app-shell__game-dividend-position">
                        <img
                          alt=""
                          className="app-shell__game-dividend-position-thumb"
                          loading="lazy"
                          src={position.thumbnailUrl}
                        />
                        <div className="app-shell__game-dividend-position-copy">
                          <p className="app-shell__game-dividend-position-title">{position.title}</p>
                          <p className="app-shell__game-dividend-position-meta">
                            현재 <span className="app-shell__game-rank-emphasis">{formatRank(position.currentRank)}</span> ·
                            평가 {formatMaybePoints(position.currentValuePoints)} · 수량 {formatGameQuantity(position.quantity)}
                          </p>
                          <p className="app-shell__game-dividend-position-meta">
                            {position.productionActive
                              ? typeof position.nextPayoutInSeconds === 'number'
                                ? `${formatHoldCountdown(position.nextPayoutInSeconds)} 뒤 예상 ${formatCoins(position.estimatedCoinYield)} 적립`
                                : `이번 집계 예상 ${formatCoins(position.estimatedCoinYield)} 적립`
                              : position.nextProductionInSeconds !== null
                                ? `${formatHoldCountdown(position.nextProductionInSeconds)} 뒤 생산 시작`
                                : '코인 생산 대상'}
                            {' · '}평가금액의 {formatPercent(position.coinRatePercent)} 적립
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="app-shell__modal-field-copy">
                    현재 Top {overview.eligibleRankCutoff} 안에 포함된 보유 포지션이 없습니다.
                  </p>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </div>,
    container,
  );
}
