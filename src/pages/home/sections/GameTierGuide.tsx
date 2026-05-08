import './GameTierGuide.css';
import BoldNumberText from './BoldNumberText';
import { profitBonusCopy, strategyBaseScoreCopy, strategyTagCriteriaCopy } from './gameTierGuideContent';
import type { GameTier } from '../../../features/game/types';

const tierGuideItems = [
  {
    title: '하이라이트 점수로 티어가 정해집니다',
    copy: '시즌 티어는 하이라이트 점수 총합으로 결정됩니다. 한 플레이에 여러 전략 태그가 붙으면 태그별 점수가 전부 합산됩니다.',
  },
  {
    title: '전략 태그 기준은 이렇습니다',
    copy: strategyTagCriteriaCopy,
  },
  {
    title: '분할 매도는 최고 기록만 반영됩니다',
    copy: '같은 포지션을 여러 번 나눠 매도하면 매도마다 하이라이트 점수가 계산되지만, 티어에는 기존 최고 하이라이트 점수를 넘긴 기록만 반영됩니다.',
  },
  {
    title: '캐시아웃은 수익률 하이라이트입니다',
    copy: '스몰 캐시아웃은 수익률 300% 이상, 빅 캐시아웃은 1,000% 이상일 때 기록됩니다. 순위 상승 폭이 작아도 수익률이 크면 캐시아웃으로 티어 점수를 올릴 수 있습니다.',
  },
  {
    title: '점수 계산은 태그별 기본점수 + 보너스입니다',
    copy: strategyBaseScoreCopy,
  },
  {
    title: '큰 수익은 추가 보너스가 붙습니다',
    copy: profitBonusCopy,
  },
];

function formatScore(score: number) {
  return `${score.toLocaleString('ko-KR')}점`;
}

function getTierThresholdCopy(tiers: GameTier[]) {
  return [...tiers]
    .filter((tier) => tier.tierCode !== 'LEGEND')
    .sort((left, right) => left.minScore - right.minScore)
    .map((tier) => `${tier.displayName} ${formatScore(tier.minScore)} 이상`)
    .join(', ');
}

interface GameTierGuideProps {
  tiers?: GameTier[];
}

export default function GameTierGuide({ tiers = [] }: GameTierGuideProps) {
  const guideItems = tiers.length > 0
    ? [
      ...tierGuideItems,
      {
        title: '티어별 점수 기준은 이렇습니다',
        copy: `기준은 ${getTierThresholdCopy(tiers)}입니다. 레전드는 500,000점 이상 유저 중 상위 10% 기준이라 시즌 점수 분포에 따라 기준 점수가 달라질 수 있습니다. 단, 마스터 달성자가 10명 미만일 경우 최고 점수 달성자가 레전드로 선정됩니다.`,
      },
    ]
    : tierGuideItems;

  return (
    <div className="app-shell__tier-guide" aria-label="하이라이트 티어 설명">
      <ol className="app-shell__tier-guide-list">
        {guideItems.map((item) => (
          <li key={item.title} className="app-shell__tier-guide-item">
            <strong className="app-shell__tier-guide-title">{item.title}</strong>
            <p className="app-shell__tier-guide-copy">
              <BoldNumberText>{item.copy}</BoldNumberText>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
