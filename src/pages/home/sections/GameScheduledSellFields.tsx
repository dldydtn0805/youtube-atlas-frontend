import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../features/game/types';

interface GameScheduledSellFieldsProps {
  conditionError?: string | null;
  disabled?: boolean;
  onChangeTriggerType: (triggerType: ScheduledSellTriggerType) => void;
  onChangeTriggerDirection: (direction: ScheduledSellTriggerDirection) => void;
  onChangeTargetRank: (rank: number | null) => void;
  onChangeTargetProfitRatePercent: (profitRatePercent: number | null) => void;
  targetRank: number | null;
  targetProfitRatePercent: number | null;
  triggerDirection: ScheduledSellTriggerDirection;
  triggerType: ScheduledSellTriggerType;
}

export default function GameScheduledSellFields({
  conditionError = null,
  disabled = false,
  onChangeTriggerType,
  onChangeTriggerDirection,
  onChangeTargetRank,
  onChangeTargetProfitRatePercent,
  targetRank,
  targetProfitRatePercent,
  triggerDirection,
  triggerType,
}: GameScheduledSellFieldsProps) {
  const isDropTrigger = triggerDirection === 'RANK_DROPS_TO';
  const quickRanks = [1, 5, 20, 50, 100];
  const quickProfitRates = [300, 500, 1000];

  return (
    <div className="app-shell__game-scheduled-sell-fields">
      <div className="app-shell__game-trade-mode-switch" aria-label="예약 매도 조건">
        <button
          className="app-shell__game-trade-mode-option"
          data-active={triggerType === 'RANK'}
          disabled={disabled}
          onClick={() => onChangeTriggerType('RANK')}
          type="button"
        >
          순위
        </button>
        <button
          className="app-shell__game-trade-mode-option"
          data-active={triggerType === 'PROFIT_RATE'}
          disabled={disabled}
          onClick={() => onChangeTriggerType('PROFIT_RATE')}
          type="button"
        >
          수익률
        </button>
      </div>
      {triggerType === 'RANK' ? (
        <>
          <div className="app-shell__game-trade-mode-switch" aria-label="순위 조건 방향">
        <button
          className="app-shell__game-trade-mode-option"
          data-active={!isDropTrigger}
          disabled={disabled}
          onClick={() => onChangeTriggerDirection('RANK_IMPROVES_TO')}
          type="button"
        >
          상승 목표
        </button>
        <button
          className="app-shell__game-trade-mode-option"
          data-active={isDropTrigger}
          disabled={disabled}
          onClick={() => onChangeTriggerDirection('RANK_DROPS_TO')}
          type="button"
        >
          하락 방어
        </button>
      </div>
      <div className="app-shell__game-scheduled-sell-header">
        <label className="app-shell__game-scheduled-sell-label" htmlFor="game-scheduled-sell-target-rank">
          {isDropTrigger ? '방어 순위' : '목표 순위'}
        </label>
        <div className="app-shell__game-scheduled-sell-quick-actions" aria-label="목표 순위 빠른 선택">
          {quickRanks.map((rank) => (
            <button
              key={rank}
              className="app-shell__game-scheduled-sell-quick-action"
              data-active={targetRank === rank}
              disabled={disabled}
              onClick={() => onChangeTargetRank(rank)}
              type="button"
            >
              {rank}위
            </button>
          ))}
        </div>
      </div>
      <div className="app-shell__game-scheduled-sell-input-wrap">
        <div className="app-shell__game-scheduled-sell-input-group">
          <input
            className="app-shell__game-scheduled-sell-input"
            disabled={disabled}
            id="game-scheduled-sell-target-rank"
            inputMode="numeric"
            min={1}
            onChange={(event) => {
              if (event.target.value === '') {
                onChangeTargetRank(null);
                return;
              }

              const nextRank = Number.parseInt(event.target.value, 10);
              onChangeTargetRank(Number.isFinite(nextRank) ? Math.max(1, nextRank) : null);
            }}
            type="number"
            value={targetRank ?? ''}
          />
          <span className="app-shell__game-scheduled-sell-suffix">
            {isDropTrigger ? '위 이하로 밀리면' : '위 이내 진입 시'}
          </span>
        </div>
      </div>
      <p className="app-shell__modal-field-copy">
        {isDropTrigger
          ? '순위 갱신 때 현재 순위가 방어 순위 밖으로 밀리면 이 포지션을 자동 매도합니다.'
          : '순위 갱신 때 현재 순위가 목표 순위 안으로 들어오면 이 포지션을 자동 매도합니다.'}
      </p>
        </>
      ) : (
        <>
          <div className="app-shell__game-scheduled-sell-header">
            <label className="app-shell__game-scheduled-sell-label" htmlFor="game-scheduled-sell-target-profit-rate">
              목표 수익률
            </label>
            <div className="app-shell__game-scheduled-sell-quick-actions" aria-label="목표 수익률 빠른 선택">
              {quickProfitRates.map((profitRatePercent) => (
                <button
                  key={profitRatePercent}
                  className="app-shell__game-scheduled-sell-quick-action"
                  data-active={targetProfitRatePercent === profitRatePercent}
                  disabled={disabled}
                  onClick={() => onChangeTargetProfitRatePercent(profitRatePercent)}
                  type="button"
                >
                  +{profitRatePercent}%
                </button>
              ))}
            </div>
          </div>
          <div className="app-shell__game-scheduled-sell-input-wrap">
            <div className="app-shell__game-scheduled-sell-input-group">
              <input
                className="app-shell__game-scheduled-sell-input"
                disabled={disabled}
                id="game-scheduled-sell-target-profit-rate"
                inputMode="decimal"
                min={0}
                onChange={(event) => {
                  if (event.target.value === '') {
                    onChangeTargetProfitRatePercent(null);
                    return;
                  }

                  const nextProfitRatePercent = Number.parseFloat(event.target.value);
                  onChangeTargetProfitRatePercent(
                    Number.isFinite(nextProfitRatePercent) ? Math.max(0, nextProfitRatePercent) : null,
                  );
                }}
                step="1"
                type="number"
                value={targetProfitRatePercent ?? ''}
              />
              <span className="app-shell__game-scheduled-sell-suffix">% 이상 수익 시</span>
            </div>
          </div>
          <p className="app-shell__modal-field-copy">
            순위 갱신 때 현재 평가 금액이 매수 금액 대비 목표 수익률에 도달하면 자동 매도합니다.
          </p>
        </>
      )}
      <p className="app-shell__game-scheduled-sell-note">
        차트아웃 상태에서는 예약 매도가 체결되지 않습니다.
      </p>
      {conditionError ? (
        <p className="app-shell__game-scheduled-sell-error">{conditionError}</p>
      ) : null}
    </div>
  );
}
