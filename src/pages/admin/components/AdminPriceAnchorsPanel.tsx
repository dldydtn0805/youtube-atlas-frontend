import { useEffect, useMemo, useState } from 'react';
import type {
  AdminPriceAnchor,
  AdminPriceAnchorUpdate,
} from '../../../features/admin/types';
import { parsePriceAnchorDrafts } from '../priceAnchorDraft';

interface AdminPriceAnchorsPanelProps {
  anchors: AdminPriceAnchor[];
  isLoading: boolean;
  isSaving: boolean;
  onSave: (anchors: AdminPriceAnchorUpdate[]) => void;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
}

export default function AdminPriceAnchorsPanel({
  anchors,
  isLoading,
  isSaving,
  onSave,
}: AdminPriceAnchorsPanelProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        anchors.map((anchor) => [anchor.rank, String(anchor.pricePoints)]),
      ),
    );
    setValidationMessage(null);
  }, [anchors]);

  const hasChanges = useMemo(
    () =>
      anchors.length > 0 &&
      anchors.every((anchor) => typeof drafts[anchor.rank] === 'string') &&
      anchors.some((anchor) => drafts[anchor.rank] !== String(anchor.pricePoints)),
    [anchors, drafts],
  );
  const latestAnchor = useMemo(
    () =>
      [...anchors].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      )[0] ?? null,
    [anchors],
  );

  const handleSave = () => {
    try {
      const updates = parsePriceAnchorDrafts(
        anchors.map((anchor) => ({
          pricePoints: drafts[anchor.rank] ?? '',
          rank: anchor.rank,
        })),
      );
      const confirmed = window.confirm(
        '가격 앵커를 저장하면 신규 매수뿐 아니라 보유 포지션 평가와 매도·예약매도 가격에도 즉시 반영됩니다. 저장할까요?',
      );

      if (!confirmed) return;

      setValidationMessage(null);
      onSave(updates);
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : '가격을 확인해주세요.');
    }
  };

  return (
    <section className="admin-page__panel">
      <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
        <div>
          <h2 className="admin-page__section-title">등수별 가격 앵커</h2>
          <p className="admin-page__section-caption">
            앵커 사이 등수는 기존과 동일하게 지수 보간되어 자동 계산됩니다.
          </p>
        </div>
        {latestAnchor ? (
          <span className="admin-page__section-caption">
            최근 저장 {formatDateTime(latestAnchor.updatedAt)}
            {latestAnchor.updatedBy ? ` · ${latestAnchor.updatedBy}` : ''}
          </span>
        ) : null}
      </div>

      {isLoading ? <p className="admin-page__muted">가격 앵커를 불러오는 중입니다.</p> : null}

      {anchors.length > 0 ? (
        <div className="admin-page__price-anchor-grid">
          {anchors.map((anchor) => (
            <label className="admin-page__field admin-page__price-anchor-field" key={anchor.rank}>
              <span>{anchor.rank}위</span>
              <div className="admin-page__price-input-wrap">
                <input
                  aria-label={`${anchor.rank}위 가격`}
                  inputMode="numeric"
                  onChange={(event) => {
                    setDrafts((current) => ({
                      ...current,
                      [anchor.rank]: event.target.value,
                    }));
                  }}
                  type="text"
                  value={drafts[anchor.rank] ?? ''}
                />
                <span>P</span>
              </div>
            </label>
          ))}
        </div>
      ) : null}

      <p className="admin-page__muted">
        낮은 등수의 가격은 앞선 등수보다 높게 저장할 수 없습니다. 변경값은 현재 시즌 전체에 즉시 적용됩니다.
      </p>
      {validationMessage ? <p className="admin-page__error">{validationMessage}</p> : null}
      <div className="admin-page__action-row">
        <button
          className="admin-page__button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? '저장 중...' : '가격 앵커 저장'}
        </button>
        <button
          className="admin-page__button admin-page__button--ghost"
          disabled={!hasChanges || isSaving}
          onClick={() => {
            setDrafts(
              Object.fromEntries(
                anchors.map((anchor) => [anchor.rank, String(anchor.pricePoints)]),
              ),
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
