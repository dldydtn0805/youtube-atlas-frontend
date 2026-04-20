import './GameTierGuide.css';

const tierGuideItems = [
  {
    title: '하이라이트 점수로 티어가 정해집니다',
    copy: '문샷, 스나이프, 캐시아웃 하이라이트가 쌓이면 점수가 오르고 시즌 티어와 리더보드 순위가 결정됩니다.',
  },
  {
    title: '문샷 · 스나이프 · 캐시아웃 기준',
    copy: '문샷은 100위 밖 매수 후 20위 안 진입, 스나이프는 150위 밖 매수 후 100위 안 진입, 캐시아웃은 수익률 300% 이상입니다.',
  },
  {
    title: 'S와 A는 이렇게 나뉩니다',
    copy: '문샷은 S, 스나이프는 A입니다. 캐시아웃은 1000% 이상이면 S, 그보다 낮으면 A로 기록됩니다.',
  },
  {
    title: '큰 수익은 추가 점수가 붙습니다',
    copy: '수익률 보너스와 별개로, 한 번에 크게 번 플레이는 절대 수익금 기준 로그 보너스가 추가돼 큰 한 방도 점수에 반영됩니다.',
  },
];

export default function GameTierGuide() {
  return (
    <div className="app-shell__tier-guide" aria-label="하이라이트 티어 설명">
      <ol className="app-shell__tier-guide-list">
        {tierGuideItems.map((item) => (
          <li key={item.title} className="app-shell__tier-guide-item">
            <strong className="app-shell__tier-guide-title">{item.title}</strong>
            <p className="app-shell__tier-guide-copy">{item.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
