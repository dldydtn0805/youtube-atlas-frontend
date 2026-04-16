import { createPortal } from 'react-dom';
import type { GameCoinOverview, GameCoinPosition, GameCoinTierProgress } from '../../../features/game/types';
import {
  formatCoins,
  formatGameQuantity,
  formatHoldCountdown,
  formatMaybePoints,
  formatPercent,
  formatPercentValue,
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

function buildCoinRateExamples(overview: GameCoinOverview) {
  const eligibleRanks = overview.ranks
    .filter((entry) => entry.rank >= 1 && entry.rank <= overview.eligibleRankCutoff)
    .sort((first, second) => first.rank - second.rank);

  if (eligibleRanks.length <= 6) {
    return eligibleRanks;
  }

  const lastIndex = eligibleRanks.length - 1;
  const exampleCount = 6;
  const exampleIndexes = Array.from({ length: exampleCount }, (_, index) =>
    Math.round((index * lastIndex) / (exampleCount - 1)),
  );

  return exampleIndexes
    .filter((entryIndex, index, array) => array.indexOf(entryIndex) === index)
    .map((entryIndex) => eligibleRanks[entryIndex]);
}

function getCoinPositionStatus(position: GameCoinPosition) {
  if (position.productionActive) {
    return typeof position.nextPayoutInSeconds === 'number'
      ? `채굴 진행 중 · ${formatHoldCountdown(position.nextPayoutInSeconds)}`
      : '채굴 진행 중';
  }

  if (!position.rankEligible && position.currentRank === null) {
    return '차트 아웃';
  }

  if (!position.rankEligible) {
    return '채굴 대상 밖';
  }

  if (position.nextProductionInSeconds !== null) {
    return `채굴 대기 · ${formatHoldCountdown(position.nextProductionInSeconds)}`;
  }

  return '코인 채굴 대상';
}

function formatCoinRateExpression(position: GameCoinPosition) {
  const baseRate = formatPercent(position.coinRatePercent);
  const finalRate = formatPercent(position.effectiveCoinRatePercent);

  if (position.holdBoostPercent > 0) {
    return `${baseRate} x (100 + ${formatPercentValue(position.holdBoostPercent)}) / 100 = ${finalRate}`;
  }

  return `${baseRate} x 100 / 100 = ${finalRate}`;
}

export default function GameDividendModal({ isOpen, onClose, overview, tierProgress }: GameDividendModalProps) {
  if (!isOpen || typeof document === 'undefined' || (!overview && !tierProgress)) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const topRate = overview?.ranks[0]?.coinRatePercent ?? 0;
  const bottomRate = overview?.ranks[overview.ranks.length - 1]?.coinRatePercent ?? 0;
  const rateExamples = overview ? buildCoinRateExamples(overview) : [];

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
                  보유한 포지션은 집계 시점 평가금액의 일부를 시즌 코인으로 채굴합니다.
                </p>
                <div className="app-shell__game-dividend-metrics" aria-label="코인 요약">
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">보유 코인</span>
                    <strong className="app-shell__game-dividend-metric-value">
                      {formatCoins(overview.myCoinBalance)}
                    </strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">채굴량</span>
                    <strong className="app-shell__game-dividend-metric-value">{formatCoins(overview.myEstimatedCoinYield)}</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">채굴 진행 중</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myActiveProducerCount}개</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">채굴 대기</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myWarmingUpPositionCount}개</strong>
                  </span>
                </div>
                <div className="app-shell__game-dividend-rule-block" aria-label="코인 채굴 로직">
                  <strong className="app-shell__game-dividend-rule-title">코인 채굴 로직</strong>
                  <ul className="app-shell__game-dividend-rule-list">
                    <li>Top {overview.eligibleRankCutoff} 안에 든 포지션만 코인 채굴 대상이 됩니다.</li>
                    <li>{formatHoldCountdown(overview.minimumHoldSeconds)} 이상 보유하면 채굴 대기 상태에서 채굴 진행 중으로 전환됩니다.</li>
                    <li>채굴 시작 후에는 10분마다 10% 채굴 부스트가 붙습니다.</li>
                    <li>채굴 부스트는 최대 100%까지 누적되어 최종 채굴 효율은 최대 2배가 됩니다.</li>
                    <li>코인은 10분마다 한 번씩 채굴됩니다.</li>
                    <li>채굴 시점의 최신 차트와 평가금액 기준으로 코인이 계산됩니다.</li>
                    <li>예를 들어 1위는 평가금액의 {formatPercent(topRate)}, {overview.eligibleRankCutoff}위는 {formatPercent(bottomRate)}가 채굴됩니다.</li>
                    <li>순위가 높을수록 채굴률이 더 가파르게 올라가며, 특히 상위권일수록 보상이 크게 커집니다.</li>
                  </ul>
                </div>
              </section>
            ) : null}

            {tierProgress ? (
              <section className="app-shell__modal-field app-shell__modal-field--tier">
                <GameCoinTierSummary progress={tierProgress} surfaceVariant="season-coin" title="티어 진행 현황" />
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">채굴률</p>
                  <h3 className="app-shell__modal-field-title">대표 순위별 코인 채굴률 예시</h3>
                </div>
                <p className="app-shell__modal-field-copy">
                  1위 {formatPercent(topRate)}에서 시작해 {overview.eligibleRankCutoff}위 {formatPercent(bottomRate)}까지
                  순위가 내려갈수록 채굴률이 낮아집니다.
                </p>
                <ul className="app-shell__game-dividend-rate-examples" aria-label="대표 순위별 코인 채굴률 예시">
                  {rateExamples.map((entry) => (
                    <li key={entry.rank} className="app-shell__game-dividend-rate-example">
                      <span className="app-shell__game-dividend-rate-example-rank">{entry.rank}위</span>
                      <strong className="app-shell__game-dividend-rate-example-value">
                        {formatPercent(entry.coinRatePercent)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">대상 포지션</p>
                  <h3 className="app-shell__modal-field-title">내 코인 채굴 대상 포지션</h3>
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
                          <div className="app-shell__game-dividend-position-heading">
                            <p className="app-shell__game-dividend-position-title">{position.title}</p>
                          </div>
                          <p className="app-shell__game-dividend-position-meta">
                            <span className="app-shell__game-dividend-position-meta-label">현재</span>{' '}
                            <span
                              className="app-shell__game-dividend-position-rank"
                              data-chart-out={!position.rankEligible && position.currentRank === null ? 'true' : undefined}
                            >
                              {formatRank(position.currentRank, {
                                chartOut: !position.rankEligible && position.currentRank === null,
                              })}
                            </span>
                            {' · '}<span className="app-shell__game-dividend-position-meta-label">평가</span>{' '}
                            {formatMaybePoints(position.currentValuePoints)}
                            {' · '}<span className="app-shell__game-dividend-position-meta-label">수량</span>{' '}
                            {formatGameQuantity(position.quantity)}
                          </p>
                          <p className="app-shell__game-dividend-position-meta">
                            <span className="app-shell__game-dividend-position-meta-label">채굴량</span>{' '}
                            {formatCoins(position.estimatedCoinYield)}
                            {' · '}<span className="app-shell__game-dividend-position-meta-label">채굴률</span>{' '}
                            {formatCoinRateExpression(position)}
                          </p>
                          <div className="app-shell__game-dividend-position-badges">
                            <span
                              className="app-shell__game-dividend-position-badge"
                              data-status={
                                position.productionActive
                                  ? 'active'
                                  : !position.rankEligible && position.currentRank === null
                                    ? 'out'
                                    : !position.rankEligible
                                      ? 'inactive'
                                      : position.nextProductionInSeconds !== null
                                        ? 'waiting'
                                        : 'steady'
                              }
                            >
                              {getCoinPositionStatus(position)}
                            </span>
                            <span className="app-shell__game-dividend-position-badge" data-status="steady">
                              채굴 부스트 {formatPercentValue(position.holdBoostPercent)}
                            </span>
                          </div>
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
