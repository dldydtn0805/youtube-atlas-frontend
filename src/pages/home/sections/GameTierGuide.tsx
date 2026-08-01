import './GameTierGuide.css';
import BoldNumberText from './BoldNumberText';
import type { GameTier } from '../../../features/game/types';

const tierGuideItems = [
  {
    title: '총자산으로 티어가 정해집니다',
    copy: '현금 포인트, 보유 영상의 현재 평가액, 예약 포인트를 모두 합친 총자산으로 시즌 티어가 결정됩니다.',
  },
  {
    title: '영상을 사도 총자산이 사라지지 않습니다',
    copy: '매수에 사용한 현금은 보유 영상 평가액으로 전환되므로 가격 변동 전에는 총자산이 그대로 유지됩니다.',
  },
  {
    title: '영상 가격 변동이 티어에도 반영됩니다',
    copy: '보유 영상의 현재 가격이 오르면 총자산과 티어 진행도가 함께 오르고, 가격이 내려가면 함께 내려갑니다.',
  },
];

function formatScore(score: number) {
  return `${score.toLocaleString('ko-KR')}P`;
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
        title: '티어별 총자산 기준은 이렇습니다',
        copy: `현재 기준은 ${getTierThresholdCopy(tiers)}입니다. 기준값은 운영 설정에 따라 변경될 수 있습니다.`,
      },
    ]
    : tierGuideItems;

  return (
    <div className="app-shell__tier-guide" aria-label="총자산 티어 설명">
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
