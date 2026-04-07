import type { GameCurrentSeason, GameMarketVideo, GamePosition } from '../../features/game/types';
import { calculateSellFeePoints, calculateSettledSellPoints } from './utils';

const pointsFormatter = new Intl.NumberFormat('ko-KR');
const seasonDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

export const SELL_FEE_RATE_LABEL = '0.3%';

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

export function formatPoints(points: number) {
  return `${pointsFormatter.format(points)}P`;
}

export function formatPointBalance(points: number) {
  return `${pointsFormatter.format(points)} 포인트`;
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
  quantity = 1,
) {
  if (!currentGameSeason || !selectedVideoMarketEntry) {
    return null;
  }

  const normalizedQuantity = Math.max(1, Math.floor(quantity));

  return currentGameSeason.wallet.balancePoints - selectedVideoMarketEntry.currentPricePoints * normalizedQuantity;
}

export function getBuyRemainingPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = 1,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints >= 0
    ? `구매 후 ${formatPointBalance(buyBalanceDeltaPoints)}가 남습니다.`
    : null;
}

export function getBuyShortfallPointsText(
  currentGameSeason?: GameCurrentSeason,
  selectedVideoMarketEntry?: GameMarketVideo,
  quantity = 1,
) {
  const buyBalanceDeltaPoints = getBuyBalanceDeltaPoints(currentGameSeason, selectedVideoMarketEntry, quantity);

  return typeof buyBalanceDeltaPoints === 'number' && buyBalanceDeltaPoints < 0
    ? `${formatPointBalance(Math.abs(buyBalanceDeltaPoints))}가 부족합니다.`
    : null;
}

export function getGamePositionQuantity(position: Pick<GamePosition, 'quantity'>) {
  return Number.isFinite(position.quantity) && position.quantity > 0 ? Math.floor(position.quantity) : 1;
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
