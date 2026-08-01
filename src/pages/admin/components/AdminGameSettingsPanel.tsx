import { useEffect, useMemo, useState } from "react";
import type { AdminGameSettings } from "../../../features/admin/types";
import { parseScheduledSellDefaultProfitRatePercent } from "../gameSettingsDraft";

interface AdminGameSettingsPanelProps {
  isLoading: boolean;
  isSaving: boolean;
  onSave: (scheduledSellDefaultProfitRatePercent: number) => void;
  settings?: AdminGameSettings;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

export default function AdminGameSettingsPanel({
  isLoading,
  isSaving,
  onSave,
  settings,
}: AdminGameSettingsPanelProps) {
  const [draft, setDraft] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setDraft(
      settings ? String(settings.scheduledSellDefaultProfitRatePercent) : "",
    );
    setValidationMessage(null);
  }, [settings]);

  const hasChanges = useMemo(
    () =>
      Boolean(settings) &&
      draft !== String(settings?.scheduledSellDefaultProfitRatePercent),
    [draft, settings],
  );

  const handleSave = () => {
    try {
      const value = parseScheduledSellDefaultProfitRatePercent(draft);
      const confirmed = window.confirm(
        `예약 매도의 목표 수익률 기본값을 ${value}%로 변경할까요? 이미 등록된 예약 매도 조건은 바뀌지 않습니다.`,
      );

      if (!confirmed) return;

      setValidationMessage(null);
      onSave(value);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : "기본 수익률을 확인해주세요.",
      );
    }
  };

  return (
    <section className="admin-page__panel">
      <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
        <div>
          <h2 className="admin-page__section-title">예약 매도 기본 설정</h2>
          <p className="admin-page__section-caption">
            사용자가 예약 매도에서 수익률 조건을 선택할 때 처음 표시할 값을
            설정합니다.
          </p>
        </div>
        {settings?.updatedAt ? (
          <span className="admin-page__section-caption">
            최근 저장 {formatDateTime(settings.updatedAt)}
            {settings.updatedBy ? ` · ${settings.updatedBy}` : ""}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="admin-page__muted">게임 설정을 불러오는 중입니다.</p>
      ) : null}

      {settings ? (
        <label className="admin-page__field admin-page__game-setting-field">
          <span>목표 수익률 기본값</span>
          <div className="admin-page__price-input-wrap">
            <input
              aria-label="예약 매도 목표 수익률 기본값"
              inputMode="decimal"
              min="0"
              onChange={(event) => setDraft(event.target.value)}
              step="0.1"
              type="number"
              value={draft}
            />
            <span>%</span>
          </div>
        </label>
      ) : null}

      <p className="admin-page__muted">
        변경값은 새로 여는 예약 매도 주문서의 입력 기본값에 적용됩니다. 사용자가
        직접 바꾼 값과 이미 등록된 주문은 유지됩니다.
      </p>
      {validationMessage ? (
        <p className="admin-page__error">{validationMessage}</p>
      ) : null}
      <div className="admin-page__action-row">
        <button
          className="admin-page__button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "저장 중..." : "기본 수익률 저장"}
        </button>
        <button
          className="admin-page__button admin-page__button--ghost"
          disabled={!hasChanges || isSaving}
          onClick={() => {
            setDraft(
              settings
                ? String(settings.scheduledSellDefaultProfitRatePercent)
                : "",
            );
            setValidationMessage(null);
          }}
          type="button"
        >
          변경 취소
        </button>
      </div>
    </section>
  );
}
