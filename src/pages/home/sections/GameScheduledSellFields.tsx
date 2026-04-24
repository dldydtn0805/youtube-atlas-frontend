import type { ScheduledSellTriggerDirection } from '../../../features/game/types';

interface GameScheduledSellFieldsProps {
  conditionError?: string | null;
  disabled?: boolean;
  onChangeTriggerDirection: (direction: ScheduledSellTriggerDirection) => void;
  onChangeTargetRank: (rank: number) => void;
  targetRank: number;
  triggerDirection: ScheduledSellTriggerDirection;
}

export default function GameScheduledSellFields({
  conditionError = null,
  disabled = false,
  onChangeTriggerDirection,
  onChangeTargetRank,
  targetRank,
  triggerDirection,
}: GameScheduledSellFieldsProps) {
  const isDropTrigger = triggerDirection === 'RANK_DROPS_TO';

  return (
    <div className="app-shell__game-scheduled-sell-fields">
      <div className="app-shell__game-trade-mode-switch" aria-label="예약 매도 조건">
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
      <label className="app-shell__game-scheduled-sell-label" htmlFor="game-scheduled-sell-target-rank">
        {isDropTrigger ? '방어 순위' : '목표 순위'}
      </label>
      <div className="app-shell__game-scheduled-sell-input-wrap">
        <input
          className="app-shell__game-scheduled-sell-input"
          disabled={disabled}
          id="game-scheduled-sell-target-rank"
          inputMode="numeric"
          min={1}
          onChange={(event) => {
            const nextRank = Number.parseInt(event.target.value, 10);
            onChangeTargetRank(Number.isFinite(nextRank) ? Math.max(1, nextRank) : 1);
          }}
          type="number"
          value={targetRank}
        />
        <span className="app-shell__game-scheduled-sell-suffix">
          {isDropTrigger ? '위 이하로 밀리면' : '위 이내 진입 시'}
        </span>
      </div>
      <p className="app-shell__modal-field-copy">
        {isDropTrigger
          ? '차트 동기화 때 현재 순위가 방어 순위 밖으로 밀리면 이 포지션을 자동 매도합니다.'
          : '차트 동기화 때 현재 순위가 목표 순위 안으로 들어오면 이 포지션을 자동 매도합니다.'}
      </p>
      <p className="app-shell__game-scheduled-sell-note">
        차트아웃 상태에서는 예약 매도가 체결되지 않습니다.
      </p>
      {conditionError ? (
        <p className="app-shell__game-scheduled-sell-error">{conditionError}</p>
      ) : null}
    </div>
  );
}
