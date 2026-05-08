import type { EChartsOption } from 'echarts';
import { chartFontFamily, formatTimestamp, formatViewCount } from './format';
import { getChartMetrics, valuesAreClose } from './metrics';
import { createEventMarkLines, createRankLineData, createViewBars } from './series';
import { formatTooltip } from './tooltip';
import type { ChartPoint } from './types';

function createDataZoom(points: ChartPoint[], isMobile: boolean) {
  const visiblePointCount = isMobile ? 18 : points.length;
  const startValue = Math.max(0, points.length - visiblePointCount);

  return [
    {
      endValue: points.length - 1,
      filterMode: 'none' as const,
      minSpan: Math.min(8, points.length),
      moveOnMouseMove: true,
      moveOnMouseWheel: true,
      startValue,
      type: 'inside' as const,
      xAxisIndex: [0, 1],
      zoomOnMouseWheel: true,
    },
  ];
}

export function createChartOption(points: ChartPoint[], isMobile: boolean): EChartsOption {
  const metrics = getChartMetrics(points);
  const timeLabels = points.map((point) => formatTimestamp(point.timestamp));
  const markLines = createEventMarkLines(points);
  const chartGridLeft = isMobile ? 72 : 58;
  const chartGridRight = isMobile ? 10 : 12;
  const rankGridHeight = isMobile ? 205 : 220;
  const viewGridTop = rankGridHeight + (isMobile ? 66 : 56);

  return {
    animationDuration: points.length > 80 ? 0 : 260,
    axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
    dataZoom: createDataZoom(points, isMobile),
    grid: [
      { containLabel: false, height: rankGridHeight, left: chartGridLeft, right: chartGridRight, top: 8 },
      { containLabel: false, height: isMobile ? 68 : 76, left: chartGridLeft, right: chartGridRight, top: viewGridTop },
    ],
    textStyle: { fontFamily: chartFontFamily },
    tooltip: {
      axisPointer: { type: 'line' },
      formatter: formatTooltip,
      textStyle: { fontFamily: chartFontFamily },
      trigger: 'axis',
    },
    xAxis: [
      {
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.24)' } },
        axisTick: { show: false },
        data: timeLabels,
        gridIndex: 0,
        type: 'category',
      },
      {
        axisLabel: { color: '#64748b', fontSize: isMobile ? 12 : 11 },
        axisLine: { lineStyle: { color: 'rgba(100, 116, 139, 0.2)' } },
        axisTick: { show: false },
        data: timeLabels,
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
            if (valuesAreClose(value, metrics.outRank) && metrics.outRank !== metrics.maxRank) {
              return 'OUT';
            }

            const roundedRank = Math.round(value);

            return valuesAreClose(value, roundedRank) && metrics.actualRanks.has(roundedRank) ? `${roundedRank}위` : '';
          },
          margin: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        gridIndex: 0,
        inverse: true,
        max: metrics.outRank,
        min: metrics.minRank,
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

            return metrics.maxViewDelta > 0 && valuesAreClose(value, metrics.maxViewDelta)
              ? formatViewCount(metrics.maxViewDelta)
              : '';
          },
          margin: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        gridIndex: 1,
        max: metrics.maxViewDelta,
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
        data: createRankLineData(points, metrics.outRank, 'faded'),
        lineStyle: { color: 'rgba(217, 119, 6, 0.36)', type: 'solid', width: 3 },
        markLine: {
          data: markLines,
          label: { color: '#64748b', formatter: '{b}' },
          lineStyle: { color: 'rgba(217, 119, 6, 0.28)', type: 'solid' },
          symbol: 'none',
        },
        name: '순위',
        showSymbol: true,
        symbolSize: 8,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        connectNulls: false,
        data: createRankLineData(points, metrics.outRank, 'active'),
        lineStyle: { color: '#e9b38f', type: 'solid', width: 3 },
        name: '순위',
        showSymbol: true,
        symbolSize: 8,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
      },
      {
        barMaxWidth: 18,
        data: createViewBars(points),
        markLine: {
          data: markLines,
          label: { color: '#64748b', formatter: '{b}' },
          lineStyle: { color: 'rgba(217, 119, 6, 0.2)', type: 'solid' },
          symbol: 'none',
        },
        name: '조회수 증가량',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
      },
    ],
  };
}
