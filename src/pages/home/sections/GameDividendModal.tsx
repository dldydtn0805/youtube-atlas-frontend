import { createPortal } from 'react-dom';
import type { GameCoinOverview, GameCoinTierProgress } from '../../../features/game/types';
import {
  formatCoinBoostMultiplier,
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

function buildCoinRateExamples(overview: GameCoinOverview) {
  const midpointRank = Math.max(2, Math.round(overview.eligibleRankCutoff / 2));
  const preferredRanks = [1, 10, 50, midpointRank, 100, overview.eligibleRankCutoff];
  const uniqueRanks = preferredRanks.filter(
    (rank, index, array) => rank <= overview.eligibleRankCutoff && array.indexOf(rank) === index,
  );

  return uniqueRanks
    .map((rank) => overview.ranks.find((entry) => entry.rank === rank))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
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
                    <span className="app-shell__game-dividend-metric-label">예상 채굴량</span>
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
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">티어 현황</p>
                  <h3 className="app-shell__modal-field-title">코인 티어 진행 현황</h3>
                </div>
                <GameCoinTierSummary progress={tierProgress} surfaceVariant="season-coin" title="현재 티어" />
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
                            {position.productionActive && position.holdBoostPercent > 0 ? (
                              <span className="app-shell__coin-boost-badge" title={`보유 시간 부스트 ${formatPercent(position.holdBoostPercent)}`}>
                                {formatCoinBoostMultiplier(position.holdBoostPercent)}
                              </span>
                            ) : null}
                          </div>
                          <p className="app-shell__game-dividend-position-meta">
                            현재{' '}
                            <span className="app-shell__game-rank-emphasis">
                              {formatRank(position.currentRank, {
                                chartOut: !position.rankEligible && position.currentRank === null,
                              })}
                            </span>{' '}
                            ·
                            평가 {formatMaybePoints(position.currentValuePoints)} · 수량 {formatGameQuantity(position.quantity)}
                          </p>
                          <p className="app-shell__game-dividend-position-meta">
                            {position.productionActive
                              ? typeof position.nextPayoutInSeconds === 'number'
                                ? `${formatHoldCountdown(position.nextPayoutInSeconds)} 뒤 예상 채굴량 ${formatCoins(position.estimatedCoinYield)}`
                                : `이번 집계 예상 채굴량 ${formatCoins(position.estimatedCoinYield)}`
                              : !position.rankEligible && position.currentRank === null
                                ? '차트 아웃 상태라 코인 채굴이 중지되었습니다.'
                                : !position.rankEligible
                                  ? '현재 채굴 대상 순위 밖입니다.'
                              : position.nextProductionInSeconds !== null
                                ? `${formatHoldCountdown(position.nextProductionInSeconds)} 뒤 채굴 시작`
                                : '코인 채굴 대상'}
                            {' · '}기본 {formatPercent(position.coinRatePercent)}
                            {position.holdBoostPercent > 0
                              ? ` + 보유 부스트 ${formatPercent(position.holdBoostPercent)} = 최종 ${formatPercent(position.effectiveCoinRatePercent)}`
                              : ` = 현재 ${formatPercent(position.effectiveCoinRatePercent)}`}
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
