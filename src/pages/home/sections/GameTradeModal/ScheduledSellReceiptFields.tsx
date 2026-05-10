import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../../features/game/types';
import './ScheduledSellReceiptFields.css';

interface ScheduledSellReceiptFieldsProps {
  conditionError?: string | null;
  disabled?: boolean;
  onChangeTargetProfitRatePercent: (profitRatePercent: number | null) => void;
  onChangeTargetRank: (rank: number | null) => void;
  onChangeTriggerDirection: (direction: ScheduledSellTriggerDirection) => void;
  onChangeTriggerType: (triggerType: ScheduledSellTriggerType) => void;
  targetProfitRatePercent: number | null;
  targetRank: number | null;
  triggerDirection: ScheduledSellTriggerDirection;
  triggerType: ScheduledSellTriggerType;
}

const QUICK_RANKS = [1, 5, 20, 50, 100];
const QUICK_PROFIT_RATES = [300, 500, 1000];

function getRankValue(targetRank: number | null) {
  return typeof targetRank === 'number' && Number.isFinite(targetRank) ? targetRank : 100;
}

function getProfitValue(targetProfitRatePercent: number | null) {
  return typeof targetProfitRatePercent === 'number' && Number.isFinite(targetProfitRatePercent)
    ? targetProfitRatePercent
    : 300;
}

export default function ScheduledSellReceiptFields({
  conditionError = null,
  disabled = false,
  onChangeTargetProfitRatePercent,
  onChangeTargetRank,
  onChangeTriggerDirection,
  onChangeTriggerType,
  targetProfitRatePercent,
  targetRank,
  triggerDirection,
  triggerType,
}: ScheduledSellReceiptFieldsProps) {
  const isRankTrigger = triggerType === 'RANK';
  const isDropTrigger = triggerDirection === 'RANK_DROPS_TO';
  const rankValue = getRankValue(targetRank);
  const profitValue = getProfitValue(targetProfitRatePercent);

  const updateTriggerValue = (direction: -1 | 1) => {
    if (isRankTrigger) {
      onChangeTargetRank(Math.max(1, rankValue + direction));
      return;
    }

    onChangeTargetProfitRatePercent(Math.max(0, profitValue + direction));
  };

  return (
    <div className="app-shell__scheduled-sell-receipt">
      <div className="app-shell__scheduled-sell-receipt-segment" aria-label="예약 매도 조건">
        <button disabled={disabled} data-active={isRankTrigger} onClick={() => onChangeTriggerType('RANK')} type="button">
          순위
        </button>
        <button disabled={disabled} data-active={!isRankTrigger} onClick={() => onChangeTriggerType('PROFIT_RATE')} type="button">
          수익률
        </button>
      </div>

      {isRankTrigger ? (
        <div className="app-shell__scheduled-sell-receipt-segment" aria-label="순위 조건 방향">
          <button
            disabled={disabled}
            data-active={!isDropTrigger}
            onClick={() => onChangeTriggerDirection('RANK_IMPROVES_TO')}
            type="button"
          >
            상승 목표
          </button>
          <button
            disabled={disabled}
            data-active={isDropTrigger}
            onClick={() => onChangeTriggerDirection('RANK_DROPS_TO')}
            type="button"
          >
            하락 방어
          </button>
        </div>
      ) : null}

      <div className="app-shell__scheduled-sell-receipt-presets">
        <span>{isRankTrigger ? (isDropTrigger ? '방어 순위' : '목표 순위') : '목표 수익률'}</span>
        {(isRankTrigger ? QUICK_RANKS : QUICK_PROFIT_RATES).map((value) => (
          <button
            key={value}
            disabled={disabled}
            data-active={isRankTrigger ? rankValue === value : profitValue === value}
            onClick={() => {
              if (isRankTrigger) {
                onChangeTargetRank(value);
              } else {
                onChangeTargetProfitRatePercent(value);
              }
            }}
            type="button"
          >
            {isRankTrigger ? `${value}위` : `+${value}%`}
          </button>
        ))}
      </div>

      <div className="app-shell__scheduled-sell-receipt-display">
        <button disabled={disabled} onClick={() => updateTriggerValue(-1)} type="button">
          -
        </button>
        <strong>{isRankTrigger ? rankValue : `+${profitValue}%`}</strong>
        <span>
          {isRankTrigger
            ? isDropTrigger
              ? '위 이하로 밀리면'
              : '위 이내 진입 시'
            : '수익률 달성 시'}
        </span>
        <button disabled={disabled} onClick={() => updateTriggerValue(1)} type="button">
          +
        </button>
      </div>

      <p className="app-shell__scheduled-sell-receipt-note">
        {isRankTrigger
          ? isDropTrigger
            ? '차트 동기화 때 현재 순위가 방어 순위 밖으로 밀리면 이 포지션을 자동 매도합니다.'
            : '차트 동기화 때 현재 순위가 목표 순위 안으로 들어오면 이 포지션을 자동 매도합니다.'
          : '차트 동기화 때 현재 평가 금액이 매수 금액 대비 목표 수익률에 도달하면 자동 매도합니다.'}
        <br />
        차트아웃 상태에서는 예약 매도가 체결되지 않습니다.
      </p>

      {conditionError ? <p className="app-shell__scheduled-sell-receipt-alert">{conditionError}</p> : null}
    </div>
  );
}
