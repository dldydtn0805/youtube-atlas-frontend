import type { AdminUserHighlightSummary } from '../../../features/admin/types';

function formatNumber(value: number | null | undefined) {
  return typeof value === 'number' ? new Intl.NumberFormat('ko-KR').format(value) : '-';
}

function formatSigned(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-';
  }

  return `${value > 0 ? '+' : ''}${formatNumber(value)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRank(value: number | null | undefined) {
  return typeof value === 'number' ? `#${formatNumber(value)}` : '-';
}

export default function AdminUserHighlightsPanel({
  error,
  isLoading,
  summary,
}: {
  error: unknown;
  isLoading: boolean;
  summary: AdminUserHighlightSummary | null | undefined;
}) {
  return (
    <div className="admin-page__detail-card">
      <div className="admin-page__section-header">
        <h3 className="admin-page__section-title">하이라이트 점수 내역</h3>
        <span className="admin-page__section-caption">
          {summary ? `${summary.regionCode} · ${summary.seasonName}` : '선택 시즌'}
        </span>
      </div>
      {isLoading ? <p className="admin-page__muted">하이라이트를 불러오는 중입니다.</p> : null}
      {error ? <p className="admin-page__error">하이라이트 내역을 불러오지 못했습니다.</p> : null}
      {summary ? (
        <>
          <div className="admin-page__detail-list admin-page__detail-list--compact">
            <p><span>계산 점수</span><strong>{formatNumber(summary.calculatedHighlightScore)}</strong></p>
            <p><span>수동 보정</span><strong>{formatSigned(summary.manualTierScoreAdjustment)}</strong></p>
            <p><span>최종 티어 점수</span><strong>{formatNumber(summary.tierScore)}</strong></p>
            <p><span>하이라이트 수</span><strong>{formatNumber(summary.highlightCount)}</strong></p>
          </div>
          {summary.highlights.length > 0 ? (
            <div className="admin-page__highlight-list">
              {summary.highlights.map((highlight) => (
                <article className="admin-page__highlight-card" key={highlight.id}>
                  <img alt="" className="admin-page__highlight-thumb" loading="lazy" src={highlight.thumbnailUrl} />
                  <div className="admin-page__highlight-body">
                    <strong>{highlight.videoTitle}</strong>
                    <span>{highlight.channelTitle}</span>
                    <p>{highlight.description}</p>
                    <div className="admin-page__highlight-meta">
                      <span>+{formatNumber(highlight.highlightScore)}점</span>
                      <span>{formatRank(highlight.buyRank)} {'->'} {formatRank(highlight.highlightRank)}</span>
                      <span>{formatSigned(highlight.profitPoints)} P</span>
                      <span>{formatDateTime(highlight.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-page__muted">아직 확정된 하이라이트가 없습니다.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
