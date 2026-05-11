import type { GameStrategyType } from '../../../../features/game/types';
import { buildGameStrategyBadges } from '../../gameStrategyTags';
import type { GameIntroPreviewType } from './steps';
import './preview.css';

interface StepPreviewProps {
  type: GameIntroPreviewType;
}

const strategySamples: Array<{ detail: string; type: GameStrategyType }> = [
  { type: 'SNIPE', detail: '150→100위' },
  { type: 'MOONSHOT', detail: '100→50위' },
  { type: 'SOLAR_SHOT', detail: '50→20위' },
  { type: 'GALAXY_SHOT', detail: '20→5위' },
  { type: 'ATLAS_SHOT', detail: '5→1위' },
  { type: 'SMALL_CASHOUT', detail: '+300%↑' },
  { type: 'BIG_CASHOUT', detail: '+1,000%↑' },
];

function TrendIcon() {
  return (
    <svg aria-hidden="true" className="app-shell__game-intro-preview-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 17l6-6 4 4 6-8M15 7h5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function TradePreview() {
  return (
    <div className="app-shell__game-intro-preview app-shell__game-intro-preview--trade" aria-hidden="true">
      <div className="app-shell__game-intro-bars">
        {[28, 18, 48, 22, 34].map((height, index) => (
          <span key={`${height}-${index}`} data-hot={index === 2 ? 'true' : undefined} style={{ height }} />
        ))}
      </div>
      <TrendIcon />
      <div className="app-shell__game-intro-profit">
        <span>수익률</span>
        <strong>+340%</strong>
      </div>
    </div>
  );
}

function HighlightsPreview() {
  return (
    <div className="app-shell__game-intro-tags" aria-hidden="true">
      {strategySamples.map((sample) => {
        const badge = buildGameStrategyBadges([sample.type])[0];

        return (
          <span key={sample.type} className="app-shell__game-position-trend" data-tone={badge.tone}>
            <span>{badge.label}</span>
            <span className="app-shell__game-intro-tag-detail">{sample.detail}</span>
          </span>
        );
      })}
    </div>
  );
}

function LeaderboardPreview() {
  const rows = [
    { rank: 1, name: 'atlas_king', score: '12,400점', tier: 'MASTER', me: false },
    { rank: 2, name: '나', score: '9,820점', tier: 'DIAMOND', me: true },
    { rank: 3, name: 'sniper99', score: '8,310점', tier: 'PLATINUM', me: false },
  ];

  return (
    <div className="app-shell__game-intro-leaderboard app-shell__game-leaderboard-row" aria-hidden="true">
      {rows.map((row) => (
        <div
          key={row.rank}
          className="app-shell__game-leaderboard-item app-shell__game-intro-leaderboard-item"
          data-me={row.me ? 'true' : 'false'}
          data-tier-code={row.tier}
        >
          <span className="app-shell__game-leaderboard-rank">{row.rank}</span>
          <span className="app-shell__game-leaderboard-avatar app-shell__game-leaderboard-avatar--fallback">
            {row.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="app-shell__game-leaderboard-name">{row.name}</span>
          <span className="app-shell__game-leaderboard-total">{row.score}</span>
        </div>
      ))}
    </div>
  );
}

export default function StepPreview({ type }: StepPreviewProps) {
  if (type === 'highlights') {
    return <HighlightsPreview />;
  }

  if (type === 'leaderboard') {
    return <LeaderboardPreview />;
  }

  return <TradePreview />;
}
