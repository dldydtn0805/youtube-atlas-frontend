import { useEffect, useMemo, useState } from 'react';
import type {
  AdminSeasonTierThresholds,
  AdminTierThresholdUpdate,
} from '../../../features/admin/types';
import { parseTierThresholdDrafts } from '../tierThresholdDraft';

interface AdminTierThresholdsPanelProps {
  isLoading: boolean;
  isSaving: boolean;
  onSave: (seasonId: number, tiers: AdminTierThresholdUpdate[]) => void;
  seasons: AdminSeasonTierThresholds[];
}

export default function AdminTierThresholdsPanel({
  isLoading,
  isSaving,
  onSave,
  seasons,
}: AdminTierThresholdsPanelProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const selectedSeason =
    seasons.find((season) => season.seasonId === selectedSeasonId) ?? seasons[0] ?? null;

  useEffect(() => {
    if (!selectedSeason || selectedSeason.seasonId === selectedSeasonId) return;
    setSelectedSeasonId(selectedSeason.seasonId);
  }, [selectedSeason, selectedSeasonId]);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        (selectedSeason?.tiers ?? []).map((tier) => [tier.tierCode, String(tier.minPoints)]),
      ),
    );
    setValidationMessage(null);
  }, [selectedSeason]);

  const hasChanges = useMemo(
    () =>
      Boolean(selectedSeason) &&
      selectedSeason!.tiers.some(
        (tier) => drafts[tier.tierCode] !== String(tier.minPoints),
      ),
    [drafts, selectedSeason],
  );

  const resetDrafts = () => {
    setDrafts(
      Object.fromEntries(
        (selectedSeason?.tiers ?? []).map((tier) => [tier.tierCode, String(tier.minPoints)]),
      ),
    );
    setValidationMessage(null);
  };

  const handleSave = () => {
    if (!selectedSeason) return;

    try {
      const tiers = parseTierThresholdDrafts(
        selectedSeason.tiers.map((tier) => ({
          displayName: tier.displayName,
          minPoints: drafts[tier.tierCode] ?? '',
          tierCode: tier.tierCode,
        })),
      );
      const confirmed = window.confirm(
        `${selectedSeason.regionCode} 시즌 티어 기준을 저장하면 모든 유저의 현재 티어에 즉시 반영됩니다. 저장할까요?`,
      );

      if (!confirmed) return;
      setValidationMessage(null);
      onSave(selectedSeason.seasonId, tiers);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : '티어 기준 포인트를 확인해주세요.',
      );
    }
  };

  return (
    <section className="admin-page__panel">
      <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
        <div>
          <h2 className="admin-page__section-title">보유 포인트 티어 기준</h2>
          <p className="admin-page__section-caption">
            현금, 보유 영상 평가액, 예약 포인트를 합친 총자산을 기준으로 티어가 결정됩니다.
          </p>
        </div>
        {seasons.length > 1 ? (
          <label className="admin-page__field">
            <span>활성 시즌</span>
            <select
              aria-label="티어 기준 시즌"
              onChange={(event) => setSelectedSeasonId(Number(event.target.value))}
              value={selectedSeason?.seasonId ?? ''}
            >
              {seasons.map((season) => (
                <option key={season.seasonId} value={season.seasonId}>
                  {season.regionCode} · {season.seasonName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {isLoading ? <p className="admin-page__muted">티어 기준을 불러오는 중입니다.</p> : null}

      {selectedSeason ? (
        <div className="admin-page__price-anchor-grid">
          {selectedSeason.tiers.map((tier, index) => (
            <label className="admin-page__field admin-page__price-anchor-field" key={tier.tierCode}>
              <span>
                {tier.displayName} · {tier.inventorySlots}칸
              </span>
              <div className="admin-page__price-input-wrap">
                <input
                  aria-label={`${tier.displayName} 기준 포인트`}
                  disabled={index === 0}
                  inputMode="numeric"
                  onChange={(event) => {
                    setDrafts((current) => ({
                      ...current,
                      [tier.tierCode]: event.target.value,
                    }));
                  }}
                  type="text"
                  value={drafts[tier.tierCode] ?? ''}
                />
                <span>P</span>
              </div>
            </label>
          ))}
        </div>
      ) : null}

      <p className="admin-page__muted">
        브론즈는 0P로 고정되며 상위 티어 기준은 이전 티어보다 커야 합니다.
      </p>
      {validationMessage ? <p className="admin-page__error">{validationMessage}</p> : null}
      <div className="admin-page__action-row">
        <button
          className="admin-page__button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? '저장 중...' : '티어 기준 저장'}
        </button>
        <button
          className="admin-page__button admin-page__button--ghost"
          disabled={!hasChanges || isSaving}
          onClick={resetDrafts}
          type="button"
        >
          변경 취소
        </button>
      </div>
    </section>
  );
}
