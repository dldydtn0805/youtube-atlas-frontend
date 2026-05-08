import { useCallback, useEffect, useRef } from 'react';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import echarts from './setup';

export default function useEChart(option: EChartsOption) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const resizeTimerRef = useRef<number | null>(null);

  const requestResize = useCallback((delay = 0) => {
    const chart = chartRef.current;

    if (!chart || typeof window === 'undefined') {
      return;
    }

    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    const resize = () => {
      resizeFrameRef.current = null;
      chart.resize();
    };

    resizeFrameRef.current = delay > 0 ? window.setTimeout(resize, delay) : window.requestAnimationFrame(resize);
  }, []);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const chart = echarts.init(elementRef.current, null, { renderer: 'canvas', useDirtyRect: true });
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(() => requestResize());

    resizeObserver.observe(elementRef.current);

    return () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }

      if (resizeTimerRef.current !== null) {
        window.clearTimeout(resizeTimerRef.current);
      }

      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [requestResize]);

  useEffect(() => {
    chartRef.current?.setOption(option, {
      lazyUpdate: true,
      replaceMerge: ['dataZoom', 'grid', 'series', 'xAxis', 'yAxis'],
    });
    requestResize();
    if (resizeTimerRef.current !== null) {
      window.clearTimeout(resizeTimerRef.current);
    }

    resizeTimerRef.current = window.setTimeout(() => requestResize(), 160);
  }, [option, requestResize]);

  return elementRef;
}
