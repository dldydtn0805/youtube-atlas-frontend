import type { GameSeasonResult } from '../../../../features/game/types';
import { formatPoints } from '../../gameHelpers';
import { formatScore, formatSignedPercent } from './seasonResultFormat';

interface SeasonResultStatsProps {
  result: GameSeasonResult;
}

export default function SeasonResultStats({ result }: SeasonResultStatsProps) {
  const profitTone =
    typeof result.profitRatePercent === 'number'
      ? result.profitRatePercent < 0 ? 'loss' : 'gain'
      : undefined;

  return (
    <dl className="game-season-result__stats">
      <div>
        <dt>최종 자산</dt>
        <dd>{formatPoints(result.finalAssetPoints)}</dd>
      </div>
      <div>
        <dt>수익률</dt>
        <dd data-tone={profitTone}>
          {formatSignedPercent(result.profitRatePercent)}
        </dd>
      </div>
      <div>
        <dt>하이라이트</dt>
        <dd>{formatScore(result.finalHighlightScore)}</dd>
      </div>
      <div>
        <dt>실현 손익</dt>
        <dd data-tone={result.realizedPnlPoints >= 0 ? 'gain' : 'loss'}>
          {formatPoints(result.realizedPnlPoints)}
        </dd>
      </div>
      <div>
        <dt>매수 건수</dt>
        <dd>{result.positionCount.toLocaleString('ko-KR')}개</dd>
      </div>
      <div>
        <dt>최고 수익률</dt>
        <dd>{formatSignedPercent(result.bestPositionProfitRatePercent)}</dd>
      </div>
    </dl>
  );
}
