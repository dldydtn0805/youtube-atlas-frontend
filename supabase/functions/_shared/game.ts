export type PriceAnchor = readonly [rank: number, pricePoints: number];

export const GAME_QUANTITY_SCALE = 100;
export const ORDER_COUNT_PRICE_BPS = 100;
export const MAX_ORDER_COUNT_PRICE_ADJUSTMENT_BPS = 3_000;

export const DEFAULT_PRICE_ANCHORS: ReadonlyArray<PriceAnchor> = [
  [1, 1_000_000],
  [2, 900_000],
  [3, 850_000],
  [4, 800_000],
  [5, 750_000],
  [6, 720_000],
  [7, 690_000],
  [8, 660_000],
  [9, 630_000],
  [10, 600_000],
  [20, 500_000],
  [30, 420_000],
  [40, 350_000],
  [50, 300_000],
  [60, 250_000],
  [70, 210_000],
  [80, 180_000],
  [90, 150_000],
  [100, 125_000],
  [110, 105_000],
  [120, 90_000],
  [130, 78_000],
  [140, 68_000],
  [150, 60_000],
  [160, 54_000],
  [170, 50_000],
  [180, 46_000],
  [190, 43_000],
  [200, 40_000],
];

export interface GameTierDefinition {
  badgeCode: string;
  displayName: string;
  inventorySlots: number;
  minScore: number;
  profileThemeCode: string;
  tierCode: string;
  titleCode: string;
}

export const TIER_DEFINITIONS: ReadonlyArray<GameTierDefinition> = [
  {
    badgeCode: 'season-bronze',
    displayName: '브론즈',
    inventorySlots: 5,
    minScore: 0,
    profileThemeCode: 'bronze',
    tierCode: 'BRONZE',
    titleCode: 'bronze-investor',
  },
  {
    badgeCode: 'season-silver',
    displayName: '실버',
    inventorySlots: 7,
    minScore: 120_000,
    profileThemeCode: 'silver',
    tierCode: 'SILVER',
    titleCode: 'silver-investor',
  },
  {
    badgeCode: 'season-gold',
    displayName: '골드',
    inventorySlots: 10,
    minScore: 150_000,
    profileThemeCode: 'gold',
    tierCode: 'GOLD',
    titleCode: 'gold-investor',
  },
  {
    badgeCode: 'season-platinum',
    displayName: '플래티넘',
    inventorySlots: 12,
    minScore: 200_000,
    profileThemeCode: 'platinum',
    tierCode: 'PLATINUM',
    titleCode: 'platinum-investor',
  },
  {
    badgeCode: 'season-diamond',
    displayName: '다이아몬드',
    inventorySlots: 15,
    minScore: 300_000,
    profileThemeCode: 'diamond',
    tierCode: 'DIAMOND',
    titleCode: 'diamond-investor',
  },
  {
    badgeCode: 'season-master',
    displayName: '마스터',
    inventorySlots: 17,
    minScore: 500_000,
    profileThemeCode: 'master',
    tierCode: 'MASTER',
    titleCode: 'master-investor',
  },
  {
    badgeCode: 'season-legend',
    displayName: '레전드',
    inventorySlots: 20,
    minScore: 1_000_000,
    profileThemeCode: 'legend',
    tierCode: 'LEGEND',
    titleCode: 'legend-investor',
  },
];

export interface TrendSignalRow {
  captured_at: string;
  category_id: string;
  category_label: string;
  channel_id?: string | null;
  channel_title: string;
  current_rank: number;
  current_view_count: number | null;
  duration?: string | null;
  is_new: boolean;
  previous_rank: number | null;
  previous_view_count: number | null;
  rank_change: number | null;
  region_code: string;
  sync_buy_count: number;
  sync_buy_quantity: number;
  sync_sell_count?: number;
  sync_sell_quantity?: number;
  thumbnail_url: string;
  title: string;
  video_category_id?: string | null;
  video_category_label?: string | null;
  video_id: string;
  view_count_delta: number | null;
}

export function calculateBasePricePoints(
  rank: number,
  priceAnchors: ReadonlyArray<PriceAnchor> = DEFAULT_PRICE_ANCHORS,
) {
  if (rank > 200) {
    return 0;
  }

  const normalizedRank = Math.max(1, Math.floor(rank));
  let previousAnchor = priceAnchors[0] ?? DEFAULT_PRICE_ANCHORS[0];

  for (const anchor of priceAnchors) {
    if (anchor[0] === normalizedRank) {
      return anchor[1];
    }

    if (anchor[0] > normalizedRank) {
      const progress = (normalizedRank - previousAnchor[0]) / (anchor[0] - previousAnchor[0]);
      return Math.round(previousAnchor[1] * Math.pow(anchor[1] / previousAnchor[1], progress));
    }

    previousAnchor = anchor;
  }

  return priceAnchors.at(-1)?.[1] ?? 0;
}

export function calculateOrderCountAdjustmentBps(
  syncBuyCount: number,
  syncSellCount: number,
) {
  const normalizedBuyCount = Number.isFinite(syncBuyCount)
    ? Math.max(0, Math.floor(syncBuyCount))
    : 0;
  const normalizedSellCount = Number.isFinite(syncSellCount)
    ? Math.max(0, Math.floor(syncSellCount))
    : 0;
  const netOrderCount = normalizedBuyCount - normalizedSellCount;

  return Math.max(
    -MAX_ORDER_COUNT_PRICE_ADJUSTMENT_BPS,
    Math.min(
      MAX_ORDER_COUNT_PRICE_ADJUSTMENT_BPS,
      netOrderCount * ORDER_COUNT_PRICE_BPS,
    ),
  );
}

export function calculateOrderCountPricePoints(
  basePricePoints: number,
  syncBuyCount: number,
  syncSellCount = 0,
) {
  if (basePricePoints <= 0) {
    return 0;
  }

  const adjustmentBps = calculateOrderCountAdjustmentBps(syncBuyCount, syncSellCount);
  return Math.max(0, Math.round((basePricePoints * (10_000 + adjustmentBps)) / 10_000));
}

export function calculateSignalPricePoints(
  signal: Pick<
    TrendSignalRow,
    'current_rank' | 'sync_buy_count' | 'sync_sell_count'
  >,
  priceAnchors: ReadonlyArray<PriceAnchor> = DEFAULT_PRICE_ANCHORS,
) {
  const basePricePoints = calculateBasePricePoints(signal.current_rank, priceAnchors);
  return calculateOrderCountPricePoints(
    basePricePoints,
    signal.sync_buy_count ?? 0,
    signal.sync_sell_count ?? 0,
  );
}

export function calculateChartOutPricePoints(
  priceAnchors: ReadonlyArray<PriceAnchor> = DEFAULT_PRICE_ANCHORS,
) {
  return Math.max(0, Math.round((calculateBasePricePoints(200, priceAnchors) * 29) / 30));
}

export function calculatePositionPoints(unitPricePoints: number, quantity: number) {
  if (unitPricePoints <= 0 || quantity <= 0) {
    return 0;
  }

  return Math.round((unitPricePoints * quantity) / 100);
}

export function calculateSellValues(
  stakePoints: number,
  quantity: number,
  unitPricePoints: number,
) {
  const sellPricePoints = calculatePositionPoints(unitPricePoints, quantity);
  const sellFeePoints = Math.floor((Math.max(0, sellPricePoints) * 3) / 1000);
  const settledPoints = Math.max(0, sellPricePoints - sellFeePoints);

  return {
    pnlPoints: settledPoints - stakePoints,
    sellFeePoints,
    sellPricePoints,
    settledPoints,
  };
}

export function resolveTier(
  score: number,
  tiers: ReadonlyArray<GameTierDefinition> = TIER_DEFINITIONS,
) {
  return [...tiers].reverse().find((tier) => score >= tier.minScore) ?? tiers[0];
}

export function resolveNextTier(
  score: number,
  tiers: ReadonlyArray<GameTierDefinition> = TIER_DEFINITIONS,
) {
  return tiers.find((tier) => score < tier.minScore) ?? null;
}

export function resolveStrategyTags(
  buyRank: number,
  currentRank: number | null,
  profitRatePercent: number | null,
) {
  if (currentRank === null) {
    return [];
  }

  const tags: string[] = [];

  if (buyRank >= 5 && currentRank <= 1) tags.push('ATLAS_SHOT');
  if (buyRank >= 20 && currentRank <= 5) tags.push('GALAXY_SHOT');
  if (buyRank >= 50 && currentRank <= 20) tags.push('SOLAR_SHOT');
  if (buyRank >= 100 && currentRank <= 50) tags.push('MOONSHOT');
  if (buyRank >= 150 && currentRank <= 100) tags.push('SNIPE');

  if (profitRatePercent !== null && profitRatePercent >= 1_000) {
    tags.push('BIG_CASHOUT');
  } else if (
    (profitRatePercent !== null && profitRatePercent >= 18) ||
    buyRank - currentRank >= 12
  ) {
    tags.push('SMALL_CASHOUT');
  }

  return tags;
}

export function toMarketVideo(
  signal: TrendSignalRow,
  canBuy = true,
  buyBlockedReason: string | null = null,
  priceAnchors: ReadonlyArray<PriceAnchor> = DEFAULT_PRICE_ANCHORS,
) {
  const basePricePoints = calculateBasePricePoints(signal.current_rank, priceAnchors);
  const currentPricePoints = calculateOrderCountPricePoints(
    basePricePoints,
    signal.sync_buy_count ?? 0,
    signal.sync_sell_count ?? 0,
  );
  const demandPriceDeltaPoints = currentPricePoints - basePricePoints;

  return {
    basePricePoints,
    buyBlockedReason,
    canBuy,
    capturedAt: signal.captured_at,
    channelTitle: signal.channel_title,
    currentPricePoints,
    currentRank: signal.current_rank,
    currentViewCount: signal.current_view_count,
    demandPriceDeltaPercent:
      basePricePoints > 0 ? (demandPriceDeltaPoints * 100) / basePricePoints : 0,
    demandPriceDeltaPoints,
    demandPriceType:
      demandPriceDeltaPoints > 0
        ? 'PREMIUM'
        : demandPriceDeltaPoints < 0
          ? 'DISCOUNT'
          : 'NONE',
    isNew: signal.is_new,
    previousRank: signal.previous_rank,
    rankChange: signal.rank_change,
    syncBuyCount: signal.sync_buy_count ?? 0,
    syncBuyQuantity: signal.sync_buy_quantity ?? 0,
    syncSellCount: signal.sync_sell_count ?? 0,
    syncSellQuantity: signal.sync_sell_quantity ?? 0,
    thumbnailUrl: signal.thumbnail_url,
    title: signal.title,
    videoId: signal.video_id,
    viewCountDelta: signal.view_count_delta,
  };
}

export function toTrendSignal(signal: TrendSignalRow) {
  return {
    capturedAt: signal.captured_at,
    categoryId: signal.category_id,
    categoryLabel: signal.category_label,
    channelId: signal.channel_id ?? '',
    channelTitle: signal.channel_title,
    currentRank: signal.current_rank,
    currentViewCount: signal.current_view_count,
    isNew: signal.is_new,
    previousRank: signal.previous_rank,
    previousViewCount: signal.previous_view_count,
    rankChange: signal.rank_change,
    regionCode: signal.region_code,
    thumbnailUrl: signal.thumbnail_url,
    title: signal.title,
    videoId: signal.video_id,
    viewCountDelta: signal.view_count_delta,
  };
}

export function toTrendVideo(signal: TrendSignalRow) {
  const thumbnail = {
    height: 0,
    url: signal.thumbnail_url,
    width: 0,
  };

  return {
    contentDetails: {
      duration: signal.duration ?? 'PT0S',
    },
    id: signal.video_id,
    snippet: {
      categoryId: signal.video_category_id ?? signal.category_id,
      categoryLabel: signal.video_category_label ?? signal.category_label,
      channelId: signal.channel_id ?? '',
      channelTitle: signal.channel_title,
      thumbnails: {
        default: thumbnail,
        high: thumbnail,
        medium: thumbnail,
      },
      title: signal.title,
    },
    statistics: {
      viewCount: signal.current_view_count === null ? null : String(signal.current_view_count),
    },
    trend: {
      capturedAt: signal.captured_at,
      categoryLabel: signal.category_label,
      currentRank: signal.current_rank,
      currentViewCount: signal.current_view_count,
      isNew: signal.is_new,
      previousRank: signal.previous_rank,
      previousViewCount: signal.previous_view_count,
      rankChange: signal.rank_change,
      viewCountDelta: signal.view_count_delta,
    },
  };
}
