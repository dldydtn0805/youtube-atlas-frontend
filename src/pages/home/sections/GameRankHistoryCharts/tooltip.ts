import { formatViewCount } from './format';

interface TooltipParam {
  axisValueLabel?: string;
  data?: { chartOut?: boolean; rankLineType?: 'active' | 'faded'; value?: number | null };
  marker?: string;
  seriesName?: string;
  value?: number | null;
}

function getTooltipValue(item: TooltipParam) {
  return item.data?.value ?? item.value;
}

function formatRankTooltip(item: TooltipParam) {
  const value = getTooltipValue(item);
  const label = item.data?.chartOut ? '차트 아웃' : `${value}위`;

  return `${item.marker ?? ''}순위 ${label}`;
}

export function formatTooltip(params: unknown) {
  const items = Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam];
  const title = items[0]?.axisValueLabel ?? '';
  const rankItems = items.filter((item) => item.seriesName === '순위' && typeof getTooltipValue(item) === 'number');
  const rankItem = rankItems.find((item) => item.data?.rankLineType === 'active') ?? rankItems[0];
  const viewItem = items.find((item) => item.seriesName === '조회수 증가량');
  const viewValue = viewItem ? getTooltipValue(viewItem) : null;

  return [
    title,
    rankItem ? formatRankTooltip(rankItem) : null,
    viewItem ? `${viewItem.marker ?? ''}${viewItem.seriesName ?? ''} ${formatViewCount(viewValue)}` : null,
  ]
    .filter(Boolean)
    .join('<br />');
}
