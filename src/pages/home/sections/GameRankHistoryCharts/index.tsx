import { useMemo } from 'react';
import { buildChartPoints } from './chartPoints';
import { createChartOption } from './option';
import type { GameRankHistoryChartsProps } from './types';
import useEChart from './useEChart';
import useIsMobileLayout from './useIsMobileLayout';

function EChart({ className, option }: { className: string; option: ReturnType<typeof createChartOption> }) {
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
