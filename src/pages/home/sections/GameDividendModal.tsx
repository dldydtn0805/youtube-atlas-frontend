import { createPortal } from 'react-dom';
import type { GameCoinOverview, GameCoinTierProgress } from '../../../features/game/types';
import {
  formatGameQuantity,
  formatHoldCountdown,
  formatMaybePoints,
  formatPercent,
  formatPoints,
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

export default function GameDividendModal({ isOpen, onClose, overview, tierProgress }: GameDividendModalProps) {
  if (!isOpen || typeof document === 'undefined' || (!overview && !tierProgress)) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const maxCoinRatePercent = Math.max(...(overview?.ranks.map((rank) => rank.coinRatePercent) ?? [1]), 1);

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
            <p className="app-shell__section-eyebrow">Season Coin Table</p>
            <h2 className="app-shell__section-title" id="game-dividend-modal-title">
              시즌 코인 & 티어
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
                  <p className="app-shell__section-eyebrow">Overview</p>
                  <h3 className="app-shell__modal-field-title">내 시즌 코인 요약</h3>
                </div>
                <p className="app-shell__modal-field-copy">
                  코인은 Top {overview.eligibleRankCutoff} 종목을 충분히 보유한 포지션만 생산합니다. 최소{' '}
                  {formatHoldCountdown(overview.minimumHoldSeconds)} 보유한 포지션만 반영돼요.
                </p>
                <div className="app-shell__game-dividend-metrics" aria-label="코인 요약">
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">보유 코인</span>
                    <strong className="app-shell__game-dividend-metric-value">
                      {formatPoints(overview.myCoinBalance)}
                    </strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">예상 생산</span>
                    <strong className="app-shell__game-dividend-metric-value">{formatPoints(overview.myEstimatedCoinYield)}</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">생산 중</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myActiveProducerCount}개</strong>
                  </span>
                  <span className="app-shell__game-dividend-metric">
                    <span className="app-shell__game-dividend-metric-label">준비 중</span>
                    <strong className="app-shell__game-dividend-metric-value">{overview.myWarmingUpPositionCount}개</strong>
                  </span>
                </div>
              </section>
            ) : null}

            {tierProgress ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">Tier</p>
                  <h3 className="app-shell__modal-field-title">시즌 티어 진행도</h3>
                </div>
                <GameCoinTierSummary progress={tierProgress} title="코인 티어 진행도" />
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">Rates</p>
                  <h3 className="app-shell__modal-field-title">1위~20위 고정 코인 생산률</h3>
                </div>
                <div className="app-shell__game-dividend-rate-chart" aria-label="코인 생산률 그래프">
                  {overview.ranks.map((rank) => (
                    <div key={rank.rank} className="app-shell__game-dividend-rate-row">
                      <span className="app-shell__game-dividend-rate-rank">{rank.rank}위</span>
                      <div className="app-shell__game-dividend-rate-bar-track">
                        <div
                          className="app-shell__game-dividend-rate-bar-fill"
                          style={{
                            width: `${(rank.coinRatePercent / maxCoinRatePercent) * 100}%`,
                          }}
                        />
                      </div>
                      <strong className="app-shell__game-dividend-rate-value">
                        {formatPercent(rank.coinRatePercent)}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {overview ? (
              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">My Positions</p>
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
                              ? `예상 생산 ${formatPoints(position.estimatedCoinYield)}`
                              : position.nextProductionInSeconds !== null
                                ? `${formatHoldCountdown(position.nextProductionInSeconds)} 뒤 생산 시작`
                                : '코인 준비 중'}
                            {' · '}생산률 {formatPercent(position.coinRatePercent)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="app-shell__modal-field-copy">
                    현재 Top {overview.eligibleRankCutoff} 안에 든 내 보유 포지션이 없습니다.
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
