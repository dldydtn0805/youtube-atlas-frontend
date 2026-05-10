import { formatPercent } from '../../gameHelpers';

export function formatSignedPercent(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '집계 중';
  }

  if (value > 0) return `+${formatPercent(value)}`;
  if (value < 0) return `-${formatPercent(Math.abs(value))}`;
  return '0%';
}

export function formatSignedScore(score: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '집계 중';
  }

  if (score > 0) return `+${score.toLocaleString('ko-KR')}점`;
  if (score < 0) return `-${Math.abs(score).toLocaleString('ko-KR')}점`;
  return '0점';
}
