import type { GameCurrentSeason, GameMarketVideo, GamePosition } from '../../features/game/types';
import { calculateSellFeePoints, calculateSettledSellPoints } from './utils';

const pointsFormatter = new Intl.NumberFormat('ko-KR');
const quantityFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 2,
});
const seasonDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

export const SELL_FEE_RATE_LABEL = '0.3%';
export const GAME_QUANTITY_SCALE = 100;
export const MIN_GAME_QUANTITY = 1;
export const DEFAULT_GAME_QUANTITY = GAME_QUANTITY_SCALE;
const KOREAN_LARGE_NUMBER_UNITS = ['', '만', '억', '조', '경', '해'];

export interface OpenGameHolding {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  currentRank: number | null;
  chartOut: boolean;
  quantity: number;
  sellableQuantity: number;
  lockedQuantity: number;
  nextSellableInSeconds: number | null;
  stakePoints: number;
  currentPricePoints: number | null;
  profitPoints: number | null;
  latestCreatedAt: string;
}

export interface GamePositionSummary {
  evaluationPoints: number;
  profitPoints: number;
  quantity: number;
  stakePoints: number;
}

export interface GameSellCandidate {
  currentPricePoints: number | null;
  profitPoints: number | null;
  quantity: number;
  stakePoints: number;
}

export interface GameSellSummary {
  feePoints: number;
  grossSellPoints: number;
  pnlPoints: number;
  quantity: number;
  settledPoints: number;
  stakePoints: number;
}

function resolveEvaluationPoints(position: Pick<GamePosition, 'currentPricePoints' | 'profitPoints' | 'stakePoints'>) {
  if (typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)) {
    return position.currentPricePoints;
  }

  if (typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)) {
    return position.stakePoints + position.profitPoints;
  }

  return position.stakePoints;
}

function resolveProfitPoints(
  position: Pick<GamePosition, 'currentPricePoints' | 'profitPoints' | 'stakePoints'>,
  evaluationPoints = resolveEvaluationPoints(position),
) {
  if (typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)) {
    return position.profitPoints;
  }

  return evaluationPoints - position.stakePoints;
}

export function formatPlaybackSaveTimestamp(positionSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(positionSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function formatHoldCountdown(remainingSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(remainingSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${String(minutes).padStart(2, '0')}분 ${String(seconds).padStart(2, '0')}초`;
  }

  if (minutes > 0) {
    return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
  }

  return `${seconds}초`;
}

export function formatFullPoints(points: number) {
  return `${pointsFormatter.format(points)}P`;
}

export function formatFullCoins(coins: number) {
  return `${pointsFormatter.format(coins)}C`;
}

function formatCompactKoreanNumber(value: number, maxSegments = 2, fullThreshold = 100_000_000) {
  const normalizedValue = Math.trunc(value);
  const absoluteValue = Math.abs(normalizedValue);

  if (absoluteValue < fullThreshold) {
    return pointsFormatter.format(normalizedValue);
  }

  const groups: string[] = [];
  let digits = absoluteValue.toString();

  while (digits.length > 0) {
    groups.unshift(digits.slice(-4));
    digits = digits.slice(0, -4);
  }

  const segments = groups
    .map((group, index) => {
      const groupValue = Number(group);
      if (groupValue === 0) {
        return null;
      }

      const unitIndex = groups.length - index - 1;
      return `${pointsFormatter.format(groupValue)}${KOREAN_LARGE_NUMBER_UNITS[unitIndex] ?? ''}`;
    })
    .filter((segment): segment is string => Boolean(segment))
    .slice(0, maxSegments);

  if (segments.length === 0) {
    return pointsFormatter.format(normalizedValue);
  }

  return `${normalizedValue < 0 ? '-' : ''}${segments.join(' ')}`;
}

export function formatCompactPoints(points: number) {
  return `${formatCompactKoreanNumber(points)}P`;
}

export function formatCompactCoins(coins: number) {
  return `${formatCompactKoreanNumber(coins)}C`;
}

export function formatPoints(points: number) {
  return formatCompactPoints(points);
}

export function formatCoins(coins: number) {
  return formatCompactCoins(coins);
}

export function formatPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '집계 중';
  }

  return `${percentFormatter.format(value)}%`;
}

export function calculateEstimatedCoinYield(currentValuePoints?: number | null, coinRatePercent?: number | null) {
  if (
    typeof currentValuePoints !== 'number' ||
    !Number.isFinite(currentValuePoints) ||
    typeof coinRatePercent !== 'number' ||
    !Number.isFinite(coinRatePercent)
  ) {
    return null;
  }

  return Math.round((currentValuePoints * coinRatePercent) / 100);
}

export function calculateEstimatedCoinYieldAfterBuy(
  currentEvaluationPoints?: number | null,
  buyPoints?: number | null,
  coinRatePercent?: number | null,
) {
  if (
    typeof currentEvaluationPoints !== 'number' ||
    !Number.isFinite(currentEvaluationPoints) ||
    typeof buyPoints !== 'number' ||
    !Number.isFinite(buyPoints)
  ) {
    return null;
  }

  return calculateEstimatedCoinYield(currentEvaluationPoints + buyPoints, coinRatePercent);
}

export function formatPointBalance(points: number) {
  return `${formatCompactKoreanNumber(points)} 포인트`;
}

export function normalizeGameQuantity(quantity?: number | null, fallback = DEFAULT_GAME_QUANTITY) {
  const normalizedFallback =
    Number.isFinite(fallback) && fallback >= MIN_GAME_QUANTITY
      ? Math.floor(fallback)
      : DEFAULT_GAME_QUANTITY;

  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < MIN_GAME_QUANTITY) {
    return normalizedFallback;
  }

  return Math.floor(quantity);
}

export function toDisplayGameQuantity(quantity?: number | null) {
  return normalizeGameQuantity(quantity) / GAME_QUANTITY_SCALE;
}

export function formatGameQuantity(quantity?: number | null) {
  const displayQuantity = toDisplayGameQuantity(quantity);

  if (Math.abs(displayQuantity) < 100_000_000) {
    return `${quantityFormatter.format(displayQuantity)}개`;
  }

  return `${formatCompactKoreanNumber(displayQuantity)}개`;
}

export function parseGameQuantityInput(quantity: number, fallback = DEFAULT_GAME_QUANTITY) {
  if (!Number.isFinite(quantity)) {
    return normalizeGameQuantity(undefined, fallback);
  }

  return Math.max(MIN_GAME_QUANTITY, Math.round(quantity * GAME_QUANTITY_SCALE));
}

export function calculateGameOrderPoints(unitPricePoints: number, quantity: number) {
  const normalizedQuantity = normalizeGameQuantity(quantity);
  return Math.floor((unitPricePoints * normalizedQuantity + GAME_QUANTITY_SCALE / 2) / GAME_QUANTITY_SCALE);
}

export function formatMaybePoints(points?: number | null) {
  return typeof points === 'number' ? formatPoints(points) : '집계 중';
}

export function getPointTone(points?: number | null) {
  if ((points ?? 0) > 0) {
    return 'gain';
  }

  if ((points ?? 0) < 0) {
    return 'loss';
  }

  return 'flat';
}

export function formatRank(rank?: number | null, options?: { chartOut?: boolean }) {
  if (options?.chartOut) {
    return '차트 아웃';
  }

  return typeof rank === 'number' ? `${rank}위` : '집계 중';
}

export function formatGameTimestamp(timestamp?: string | null) {
  if (!timestamp) {
    return '집계 중';
  }

  return seasonDateTimeFormatter.format(new Date(timestamp));
}

export function getBuyBalanceDeltaPoints(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = DEFAULT_GAME_QUANTITY,
) {
  if (!currentGameSeason || !selectedVideoMarketEntry) {
    return null;
  }

  return (
    currentGameSeason.wallet.balancePoints -
    calculateGameOrderPoints(selectedVideoMarketEntry.currentPricePoints, quantity)
  );
}

export function getBuyRemainingPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = DEFAULT_GAME_QUANTITY,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints >= 0
    ? `구매 후 ${formatPointBalance(buyBalanceDeltaPoints)}가 남습니다.`
    : null;
}

export function getBuyShortfallPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = DEFAULT_GAME_QUANTITY,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints < 0
    ? `${formatPointBalance(Math.abs(buyBalanceDeltaPoints))}가 부족합니다.`
    : null;
}

export function getGamePositionQuantity(position: Pick<GamePosition, 'quantity'>) {
  return normalizeGameQuantity(position.quantity);
}

export function summarizeGamePositions(positions: GamePosition[]): GamePositionSummary {
  return positions.reduce<GamePositionSummary>(
    (totals, position) => {
      const evaluationPoints = resolveEvaluationPoints(position);
      const profitPoints = resolveProfitPoints(position, evaluationPoints);

      totals.stakePoints += position.stakePoints;
      totals.evaluationPoints += evaluationPoints;
      totals.profitPoints += profitPoints;
      totals.quantity += getGamePositionQuantity(position);
      return totals;
    },
    {
      evaluationPoints: 0,
      profitPoints: 0,
      quantity: 0,
      stakePoints: 0,
    },
  );
}

export function buildOpenGameHoldings(
  openGamePositions: GamePosition[],
  getRemainingHoldSeconds: (position: GamePosition) => number,
) {
  const holdingByVideoId = new Map<string, OpenGameHolding>();

  for (const position of openGamePositions) {
    const quantity = getGamePositionQuantity(position);
    const remainingHoldSeconds = getRemainingHoldSeconds(position);
    const currentPricePoints = resolveEvaluationPoints(position);
    const profitPoints = resolveProfitPoints(position, currentPricePoints);
    const sellableQuantity = remainingHoldSeconds <= 0 ? quantity : 0;
    const lockedQuantity = Math.max(0, quantity - sellableQuantity);
    const existingHolding = holdingByVideoId.get(position.videoId);

    if (!existingHolding) {
      holdingByVideoId.set(position.videoId, {
        videoId: position.videoId,
        title: position.title,
        channelTitle: position.channelTitle,
        thumbnailUrl: position.thumbnailUrl,
        currentRank: position.currentRank,
        chartOut: position.chartOut,
        quantity,
        sellableQuantity,
        lockedQuantity,
        nextSellableInSeconds: lockedQuantity > 0 ? remainingHoldSeconds : null,
        stakePoints: position.stakePoints,
        currentPricePoints,
        profitPoints,
        latestCreatedAt: position.createdAt,
      });
      continue;
    }

    existingHolding.quantity += quantity;
    existingHolding.sellableQuantity += sellableQuantity;
    existingHolding.lockedQuantity += lockedQuantity;
    existingHolding.stakePoints += position.stakePoints;
    existingHolding.currentPricePoints = (existingHolding.currentPricePoints ?? 0) + currentPricePoints;
    existingHolding.profitPoints = (existingHolding.profitPoints ?? 0) + profitPoints;

    if (lockedQuantity > 0) {
      existingHolding.nextSellableInSeconds =
        existingHolding.nextSellableInSeconds === null
          ? remainingHoldSeconds
          : Math.min(existingHolding.nextSellableInSeconds, remainingHoldSeconds);
    }

    if (new Date(position.createdAt).getTime() > new Date(existingHolding.latestCreatedAt).getTime()) {
      existingHolding.latestCreatedAt = position.createdAt;
    }

    if (typeof existingHolding.currentRank !== 'number' && typeof position.currentRank === 'number') {
      existingHolding.currentRank = position.currentRank;
    }

    existingHolding.chartOut = existingHolding.chartOut || position.chartOut;
  }

  return [...holdingByVideoId.values()].sort(
    (left, right) => new Date(right.latestCreatedAt).getTime() - new Date(left.latestCreatedAt).getTime(),
  );
}

export function buildSellCandidates(
  sellablePositions: GamePosition[],
  normalizedSellQuantity: number,
) {
  let remainingQuantity = normalizedSellQuantity;

  return sellablePositions.flatMap<GameSellCandidate>((position) => {
    if (remainingQuantity <= 0) {
      return [];
    }

    const fullQuantity = getGamePositionQuantity(position);
    const quantity = Math.min(remainingQuantity, fullQuantity);

    remainingQuantity -= quantity;

    return [
      {
        currentPricePoints:
          typeof position.currentPricePoints === 'number' && Number.isFinite(position.currentPricePoints)
            ? Math.round((position.currentPricePoints / fullQuantity) * quantity)
            : null,
        profitPoints:
          typeof position.profitPoints === 'number' && Number.isFinite(position.profitPoints)
            ? Math.round((position.profitPoints / fullQuantity) * quantity)
            : null,
        quantity,
        stakePoints: Math.round((position.stakePoints / fullQuantity) * quantity),
      },
    ];
  });
}

export function summarizeSellCandidates(candidates: GameSellCandidate[]) {
  return candidates.reduce<GameSellSummary>(
    (totals, candidate) => {
      const grossSellPoints =
        typeof candidate.currentPricePoints === 'number' && Number.isFinite(candidate.currentPricePoints)
          ? candidate.currentPricePoints
          : typeof candidate.profitPoints === 'number' && Number.isFinite(candidate.profitPoints)
            ? candidate.stakePoints + candidate.profitPoints
            : candidate.stakePoints;
      const feePoints = calculateSellFeePoints(grossSellPoints);
      const settledPoints = calculateSettledSellPoints(grossSellPoints);
      const pnlPoints = settledPoints - candidate.stakePoints;

      totals.feePoints += feePoints;
      totals.grossSellPoints += grossSellPoints;
      totals.pnlPoints += pnlPoints;
      totals.settledPoints += settledPoints;
      totals.quantity += candidate.quantity;
      totals.stakePoints += candidate.stakePoints;
      return totals;
    },
    {
      feePoints: 0,
      grossSellPoints: 0,
      pnlPoints: 0,
      quantity: 0,
      settledPoints: 0,
      stakePoints: 0,
    },
  );
}

export function formatSeasonDateTime(timestamp: string) {
  return seasonDateTimeFormatter.format(new Date(timestamp));
}
