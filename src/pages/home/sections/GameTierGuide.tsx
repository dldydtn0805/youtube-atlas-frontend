import './GameTierGuide.css';
import BoldNumberText from './BoldNumberText';

const tierGuideItems = [
  {
    title: '하이라이트 점수로 티어가 정해집니다',
    copy: '시즌 티어는 하이라이트 점수 총합으로 결정됩니다. 한 플레이에 여러 전략 태그가 붙으면 태그별 점수가 전부 합산됩니다.',
  },
  {
    title: '전략 태그 기준은 이렇습니다',
    copy: '문샷은 100위 바깥에서 매수한 영상이 20위 안으로 진입할 때 붙는 핵심 하이라이트입니다. 스나이프는 150위 바깥에서 가능성을 보고 매수해 100위 안에 진입했을 때 붙습니다.',
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
    copy: '문샷은 기본 15,000점, 빅 캐시아웃은 기본 5,000점, 스나이프와 스몰 캐시아웃은 기본 2,500점입니다. 여기에 순위 상승폭 × 20점, 수익률(%) × 10점이 더해지며 수익률 보너스는 최대 5,000점까지 반영됩니다.',
  },
  {
    title: '큰 수익은 추가 보너스가 붙습니다',
    copy: '수익금이 5,000P를 넘기면 추가 점수가 붙습니다. 예를 들어 수익금이 30,000P면 약 474점, 100,000P면 약 925점이 더해집니다. 수익금 추가 보너스는 전략 종류와 상관없이 최대 15,000점까지만 반영됩니다.',
  },
];

export default function GameTierGuide() {
  return (
    <div className="app-shell__tier-guide" aria-label="하이라이트 티어 설명">
      <ol className="app-shell__tier-guide-list">
        {tierGuideItems.map((item) => (
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
