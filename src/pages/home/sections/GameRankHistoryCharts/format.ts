const rankDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

const viewCountFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

export const chartFontFamily = 'Mona12, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export function formatTimestamp(timestamp?: string | null) {
  return timestamp ? rankDateFormatter.format(new Date(timestamp)) : '집계 중';
}

export function formatViewCount(viewCount?: number | null) {
  return typeof viewCount === 'number' ? `${viewCountFormatter.format(viewCount)}회` : '0회';
}
