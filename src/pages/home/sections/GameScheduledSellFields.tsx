interface GameScheduledSellFieldsProps {
  disabled?: boolean;
  onChangeTargetRank: (rank: number) => void;
  targetRank: number;
}

export default function GameScheduledSellFields({
  disabled = false,
  onChangeTargetRank,
  targetRank,
}: GameScheduledSellFieldsProps) {
  return (
    <div className="app-shell__game-scheduled-sell-fields">
      <label className="app-shell__game-scheduled-sell-label" htmlFor="game-scheduled-sell-target-rank">
        목표 순위
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
        <span className="app-shell__game-scheduled-sell-suffix">위 이내 진입 시</span>
      </div>
      <p className="app-shell__modal-field-copy">
        차트 동기화 때 현재 순위가 목표 순위 안으로 들어오면 이 포지션을 자동 매도합니다.
      </p>
    </div>
  );
}
