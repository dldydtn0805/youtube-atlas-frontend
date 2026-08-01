import type { GameSeasonResult } from '../../../../features/game/types';
import { formatPoints } from '../../gameHelpers';
import { formatScore, formatSignedPercent } from './seasonResultFormat';

function bound(value: number) {
  return Math.max(8, Math.min(100, Math.round(value)));
}

function percentWidth(value?: number | null) {
  return typeof value === 'number' ? bound(Math.abs(value) * 2) : 8;
}

export function getReportChartMetrics(result: GameSeasonResult) {
  return [
    {
      label: '수익률',
      tone: result.profitRatePercent != null && result.profitRatePercent < 0 ? 'loss' : 'gain',
      value: formatSignedPercent(result.profitRatePercent),
      width: percentWidth(result.profitRatePercent),
    },
    {
      label: '실현 손익',
      tone: result.realizedPnlPoints < 0 ? 'loss' : 'gain',
      value: formatPoints(result.realizedPnlPoints),
      width: bound(Math.abs(result.realizedPnlPoints) / 100),
    },
    {
      label: '매수 건수',
      tone: 'neutral',
      value: `${result.positionCount.toLocaleString('ko-KR')}개`,
      width: bound(result.positionCount * 8),
    },
    {
      label: '하이라이트',
      tone: 'neutral',
      value: formatScore(result.finalHighlightScore),
      width: bound(result.finalHighlightScore / 10),
    },
  ] as const;
}
