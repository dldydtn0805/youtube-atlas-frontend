import { useCallback, useEffect, useRef } from 'react';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import echarts from './setup';

export default function useEChart(option: EChartsOption) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const paintFrameRef = useRef<number | null>(null);
  const paintTimerRef = useRef<number | null>(null);

  const refreshChartPaint = useCallback(() => {
    const chart = chartRef.current;

    if (!chart || typeof window === 'undefined') {
      return;
    }

    if (paintFrameRef.current !== null) {
      window.cancelAnimationFrame(paintFrameRef.current);
    }

    if (paintTimerRef.current !== null) {
      window.clearTimeout(paintTimerRef.current);
    }

    paintFrameRef.current = window.requestAnimationFrame(() => {
      paintFrameRef.current = window.requestAnimationFrame(() => {
        paintFrameRef.current = null;
        chart.resize();
      });
    });
    paintTimerRef.current = window.setTimeout(() => {
      paintTimerRef.current = null;
      chart.resize();
    }, 160);
  }, []);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const chart = echarts.init(elementRef.current, null, { renderer: 'svg' });
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(() => chart.resize());

    resizeObserver.observe(elementRef.current);

    return () => {
      if (paintFrameRef.current !== null) {
        window.cancelAnimationFrame(paintFrameRef.current);
      }

      if (paintTimerRef.current !== null) {
        window.clearTimeout(paintTimerRef.current);
      }

      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
    refreshChartPaint();
  }, [option, refreshChartPaint]);

  return elementRef;
}
