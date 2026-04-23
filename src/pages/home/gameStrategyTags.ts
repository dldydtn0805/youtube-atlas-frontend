import type { GameStrategyType } from '../../features/game/types';

type GameStrategyTone = 'atlas-shot' | 'moonshot' | 'cashout' | 'snipe';
type GameStrategyContext = 'highlight' | 'position';
type PositionStrategyState = 'achieved' | 'target';

export interface GameStrategyBadge {
  label: string;
  tone: GameStrategyTone;
  type: GameStrategyType;
}

export interface PositionStrategyBadge extends GameStrategyBadge {
  state: PositionStrategyState;
}

const STRATEGY_TONE_BY_TYPE: Record<GameStrategyType, GameStrategyTone> = {
  ATLAS_SHOT: 'atlas-shot',
  BIG_CASHOUT: 'cashout',
  MOONSHOT: 'moonshot',
  SMALL_CASHOUT: 'cashout',
  SNIPE: 'snipe',
};

function isGameStrategyType(value: string): value is GameStrategyType {
  return (
    value === 'ATLAS_SHOT'
    || value === 'MOONSHOT'
    || value === 'SMALL_CASHOUT'
    || value === 'BIG_CASHOUT'
    || value === 'SNIPE'
  );
}

function getStrategyLabel(type: GameStrategyType, context: GameStrategyContext) {
  if (context === 'position') {
    if (type === 'ATLAS_SHOT') {
      return '아틀라스 샷 노림';
    }

    if (type === 'MOONSHOT') {
      return '문샷 노림';
    }

    if (type === 'SMALL_CASHOUT') {
      return '스몰 캐시아웃 노림';
    }

    if (type === 'BIG_CASHOUT') {
      return '빅 캐시아웃 노림';
    }

    return '스나이프 노림';
  }

  if (type === 'ATLAS_SHOT') {
    return '아틀라스 샷';
  }

  if (type === 'MOONSHOT') {
    return '문샷';
  }

  if (type === 'SMALL_CASHOUT') {
    return '스몰 캐시아웃';
  }

  if (type === 'BIG_CASHOUT') {
    return '빅 캐시아웃';
  }

  return '스나이프';
}

export function resolveGameStrategyTags(
  strategyTags?: GameStrategyType[] | null,
  fallbackType?: string | null,
) {
  const normalizedTags = (strategyTags ?? []).filter(isGameStrategyType);

  if (normalizedTags.length > 0) {
    return normalizedTags;
  }

  return fallbackType && isGameStrategyType(fallbackType) ? [fallbackType] : [];
}

export function buildGameStrategyBadges(
  strategyTags?: GameStrategyType[] | null,
  fallbackType?: string | null,
  context: GameStrategyContext = 'highlight',
) {
  return resolveGameStrategyTags(strategyTags, fallbackType).map((type) => ({
    label: getStrategyLabel(type, context),
    tone: STRATEGY_TONE_BY_TYPE[type],
    type,
  }));
}

export function buildPositionStrategyBadges(
  achievedStrategyTags?: GameStrategyType[] | null,
  targetStrategyTags?: GameStrategyType[] | null,
) {
  const achievedBadges = resolveGameStrategyTags(achievedStrategyTags).map((type) => ({
    label: getStrategyLabel(type, 'highlight').concat(' 달성'),
    tone: STRATEGY_TONE_BY_TYPE[type],
    type,
    state: 'achieved' as const,
  }));
  const targetBadges = resolveGameStrategyTags(targetStrategyTags).map((type) => ({
    label: getStrategyLabel(type, 'position'),
    tone: STRATEGY_TONE_BY_TYPE[type],
    type,
    state: 'target' as const,
  }));

  return [...achievedBadges, ...targetBadges];
}
