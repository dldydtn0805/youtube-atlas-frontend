import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import type { GamePositionRankHistoryPoint } from '../../../features/game/types';
import type { VideoRankHistory } from '../../../features/trending/types';

type RankHistoryPoint = GamePositionRankHistoryPoint | VideoRankHistory['points'][number];

echarts.use([BarChart, DataZoomComponent, GridComponent, LineChart, MarkLineComponent, SVGRenderer, TooltipComponent]);

interface GameRankHistoryChartsProps {
  points: RankHistoryPoint[];
}

interface ChartPoint {
  chartOut: boolean;
  eventLabel: string | null;
  isFaded: boolean;
  rank: number | null;
  timestamp: string;
  viewDelta: number | null;
}

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

function formatTimestamp(timestamp?: string | null) {
  return timestamp ? rankDateFormatter.format(new Date(timestamp)) : '집계 중';
}

function formatViewCount(viewCount?: number | null) {
  return typeof viewCount === 'number' ? `${viewCountFormatter.format(viewCount)}회` : '0회';
}

function getEventLabel(point: RankHistoryPoint) {
  if ('buyPoint' in point && point.buyPoint) {
    return 'B';
  }

  if ('sellPoint' in point && point.sellPoint) {
    return 'S';
  }

  return null;
}

function getFadedFlags(points: RankHistoryPoint[]) {
  const buyPointIndex = points.findIndex((point) => 'buyPoint' in point && point.buyPoint);
  let isHolding = false;

  return points.map((point, index) => {
    const isBuyPoint = 'buyPoint' in point && point.buyPoint;
    const isSellPoint = 'sellPoint' in point && point.sellPoint;

    if (isBuyPoint) {
      isHolding = true;
    }

    const isPreBuy = 'buyPoint' in point && buyPointIndex > 0 && index < buyPointIndex;
    const isInactive = !isHolding && !isBuyPoint && !isSellPoint;

    if (isSellPoint) {
      isHolding = false;
    }

    return isPreBuy || isInactive;
  });
}

function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function useEChart(option: EChartsOption) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const chart = echarts.init(elementRef.current, null, { renderer: 'svg' });
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(() => chart.resize());

    resizeObserver.observe(elementRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return elementRef;
}

function buildChartPoints(points: RankHistoryPoint[]) {
  const fadedFlags = getFadedFlags(points);

  return points.map((point, index): ChartPoint => {
    const currentViewCount = point.viewCount;
    const previousViewCount = index > 0 ? points[index - 1]?.viewCount : null;
    const viewDelta =
      typeof currentViewCount === 'number' &&
      typeof previousViewCount === 'number' &&
      currentViewCount >= previousViewCount
        ? currentViewCount - previousViewCount
        : null;

    return {
      chartOut: point.chartOut && typeof point.rank !== 'number',
      eventLabel: getEventLabel(point),
      isFaded: fadedFlags[index] ?? false,
      rank: point.rank,
      timestamp: point.capturedAt,
      viewDelta,
    };
  });
}

function createDataZoom(points: ChartPoint[], isMobile: boolean) {
  const visiblePointCount = isMobile ? 18 : points.length;
  const startValue = Math.max(0, points.length - visiblePointCount);

  return [
    {
      endValue: points.length - 1,
      filterMode: 'none' as const,
      minSpan: Math.min(8, points.length),
      startValue,
      type: 'inside' as const,
      xAxisIndex: [0, 1],
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: true,
    },
  ];
}

function createEventMarkLines(points: ChartPoint[]) {
  return points
    .map((point, index) => (point.eventLabel ? { name: point.eventLabel, xAxis: index } : null))
    .filter((point): point is { name: string; xAxis: number } => Boolean(point));
}

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

function formatTooltip(params: unknown) {
  const items = Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam];
  const title = items[0]?.axisValueLabel ?? '';
  const rankItems = items.filter((item) => item.seriesName === '순위' && typeof getTooltipValue(item) === 'number');
  const rankItem = rankItems.find((item) => item.data?.rankLineType === 'active') ?? rankItems[0];
  const viewItem = items.find((item) => item.seriesName === '조회수 증가량');
  const viewValue = viewItem ? getTooltipValue(viewItem) : null;
  const lines = [
    rankItem ? formatRankTooltip(rankItem) : null,
    viewItem
      ? `${viewItem.marker ?? ''}${viewItem.seriesName ?? ''} ${
          formatViewCount(typeof viewValue === 'number' ? viewValue : null)
        }`
      : null,
  ];

  return [title, ...lines].filter(Boolean).join('<br />');
}

function valuesAreClose(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

function createRankLineData(points: ChartPoint[], outRank: number, rankLineType: 'active' | 'faded') {
  return points.map((point) => {
    const belongsToLine = rankLineType === 'active' ? !point.isFaded : point.isFaded || Boolean(point.eventLabel);
    const value = belongsToLine ? (point.chartOut ? outRank : point.rank) : null;

    return {
      chartOut: point.chartOut,
      itemStyle: {
        borderColor: point.chartOut ? '#92400e' : undefined,
        borderWidth: point.chartOut ? 2 : 0,
        color: point.chartOut ? '#f59e0b' : point.isFaded ? 'rgba(217, 119, 6, 0.38)' : '#f2b47b',
      },
      rankLineType,
      symbol: point.chartOut ? 'emptyCircle' : 'circle',
      value,
    };
  });
}

function createChartOption(points: ChartPoint[], isMobile: boolean): EChartsOption {
  const rankedPoints = points.filter((point) => typeof point.rank === 'number');
  const minRank = rankedPoints.length > 0 ? Math.min(...rankedPoints.map((point) => point.rank as number)) : 1;
  const maxRank = rankedPoints.length > 0 ? Math.max(...rankedPoints.map((point) => point.rank as number)) : 100;
  const outRank = points.some((point) => point.chartOut) ? maxRank + Math.max(1, Math.round((maxRank - minRank) * 0.18)) : maxRank;
  const maxViewDelta = Math.max(0, ...points.map((point) => point.viewDelta ?? 0));
  const actualRanks = new Set(rankedPoints.map((point) => point.rank as number));
  const chartGridLeft = isMobile ? 72 : 58;
  const chartGridRight = isMobile ? 10 : 12;
  const rankGridHeight = isMobile ? 205 : 220;
  const viewGridTop = rankGridHeight + (isMobile ? 52 : 56);

  return {
    animationDuration: 380,
    axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
    dataZoom: createDataZoom(points, isMobile),
    grid: [
      { containLabel: false, height: rankGridHeight, left: chartGridLeft, right: chartGridRight, top: 8 },
      { containLabel: false, height: isMobile ? 68 : 76, left: chartGridLeft, right: chartGridRight, top: viewGridTop },
    ],
    tooltip: {
      axisPointer: { type: 'line' },
      formatter: (params: unknown) => formatTooltip(params),
      trigger: 'axis',
    },
    xAxis: [
      {
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.24)' } },
        axisTick: { show: false },
        data: points.map((point) => formatTimestamp(point.timestamp)),
        gridIndex: 0,
        type: 'category',
      },
      {
        axisLabel: { color: '#64748b', fontSize: isMobile ? 12 : 11 },
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.2)' } },
        axisTick: { show: false },
        data: points.map((point) => formatTimestamp(point.timestamp)),
        gridIndex: 1,
        type: 'category',
      },
    ],
    yAxis: [
      {
        axisLabel: {
          color: '#64748b',
          fontSize: isMobile ? 14 : 11,
          fontWeight: 800,
          formatter: (value: number) => {
            if (valuesAreClose(value, outRank) && outRank !== maxRank) {
              return 'OUT';
            }

            const roundedRank = Math.round(value);

            return valuesAreClose(value, roundedRank) && actualRanks.has(roundedRank) ? `${roundedRank}위` : '';
          },
          margin: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        gridIndex: 0,
        inverse: true,
        max: outRank,
        min: minRank,
        splitLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.16)' } },
        type: 'value',
      },
      {
        axisLabel: {
          color: '#64748b',
          fontSize: isMobile ? 13 : 10,
          fontWeight: 800,
          formatter: (value: number) => {
            if (valuesAreClose(value, 0)) {
              return '0회';
            }

            return maxViewDelta > 0 && valuesAreClose(value, maxViewDelta) ? formatViewCount(maxViewDelta) : '';
          },
          margin: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        gridIndex: 1,
        max: maxViewDelta,
        min: 0,
        name: '조회수 증가량',
        nameLocation: 'end',
        nameTextStyle: { color: '#64748b', fontSize: isMobile ? 11 : 10, fontWeight: 800, padding: [0, 0, 2, 0] },
        splitLine: { show: false },
        type: 'value',
      },
    ],
    series: [
      {
        connectNulls: false,
        data: createRankLineData(points, outRank, 'faded'),
        name: '순위',
        lineStyle: { color: 'rgba(217, 119, 6, 0.36)', type: 'dashed', width: 3 },
        markLine: {
          data: createEventMarkLines(points),
          label: { color: '#64748b', formatter: '{b}' },
          lineStyle: { color: 'rgba(217, 119, 6, 0.28)', type: 'dashed' },
          symbol: 'none',
        },
        showSymbol: true,
        symbolSize: 8,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        connectNulls: false,
        data: createRankLineData(points, outRank, 'active'),
        name: '순위',
        lineStyle: { color: '#e9b38f', type: 'solid', width: 3 },
        showSymbol: true,
        symbolSize: 8,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        barMaxWidth: 18,
        data: points.map((point) => ({
          itemStyle: { color: point.isFaded ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.22)' },
          value: point.viewDelta,
        })),
        name: '조회수 증가량',
        markLine: {
          data: createEventMarkLines(points),
          label: { color: '#64748b', formatter: '{b}' },
          lineStyle: { color: 'rgba(217, 119, 6, 0.2)', type: 'dashed' },
          symbol: 'none',
        },
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
      },
    ],
  };
}

function EChart({ className, option }: { className: string; option: EChartsOption }) {
  const ref = useEChart(option);

  return <div ref={ref} className={className} />;
}

export default function GameRankHistoryCharts({ points }: GameRankHistoryChartsProps) {
  const isMobile = useIsMobileLayout();
  const chartPoints = useMemo(() => buildChartPoints(points), [points]);
  const option = useMemo(() => createChartOption(chartPoints, isMobile), [chartPoints, isMobile]);

  return (
    <div className="app-shell__game-rank-history-charts">
      <EChart className="app-shell__game-rank-history-echart" option={option} />
    </div>
  );
}
