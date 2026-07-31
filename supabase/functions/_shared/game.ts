const PRICE_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [1, 2_000_000],
  [2, 1_333_333],
  [3, 1_320_000],
  [4, 1_300_000],
  [5, 1_270_000],
  [6, 1_240_000],
  [7, 1_200_000],
  [8, 1_150_000],
  [9, 1_100_000],
  [10, 1_050_000],
  [20, 750_000],
  [30, 550_000],
  [40, 400_000],
  [50, 290_000],
  [60, 210_000],
  [70, 150_000],
  [80, 110_000],
  [90, 80_000],
  [100, 58_000],
  [110, 42_000],
  [120, 31_000],
  [130, 23_000],
  [140, 17_000],
  [150, 13_000],
  [160, 10_000],
  [170, 7_500],
  [180, 5_500],
  [190, 4_000],
  [200, 3_000],
];

export const TIER_DEFINITIONS = [
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
    minScore: 5_000,
    profileThemeCode: 'silver',
    tierCode: 'SILVER',
    titleCode: 'silver-investor',
  },
  {
    badgeCode: 'season-gold',
    displayName: '골드',
    inventorySlots: 10,
    minScore: 15_000,
    profileThemeCode: 'gold',
    tierCode: 'GOLD',
    titleCode: 'gold-investor',
  },
  {
    badgeCode: 'season-platinum',
    displayName: '플래티넘',
    inventorySlots: 12,
    minScore: 60_000,
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
    minScore: 1_800_000,
    profileThemeCode: 'master',
    tierCode: 'MASTER',
    titleCode: 'master-investor',
  },
  {
    badgeCode: 'season-legend',
    displayName: '레전드',
    inventorySlots: 20,
    minScore: 12_600_000,
    profileThemeCode: 'legend',
    tierCode: 'LEGEND',
    titleCode: 'legend-investor',
  },
] as const;

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
  thumbnail_url: string;
  title: string;
  video_category_id?: string | null;
  video_category_label?: string | null;
  video_id: string;
  view_count_delta: number | null;
}

export function calculateBasePricePoints(rank: number) {
  if (rank > 200) {
    return 0;
  }

  const normalizedRank = Math.max(1, Math.floor(rank));
  let previousAnchor = PRICE_ANCHORS[0];

  for (const anchor of PRICE_ANCHORS) {
    if (anchor[0] === normalizedRank) {
      return anchor[1];
    }

    if (anchor[0] > normalizedRank) {
      const progress =
        (normalizedRank - previousAnchor[0]) / (anchor[0] - previousAnchor[0]);
      return Math.round(
        previousAnchor[1] * Math.pow(anchor[1] / previousAnchor[1], progress),
      );
    }

    previousAnchor = anchor;
  }

  return PRICE_ANCHORS.at(-1)?.[1] ?? 0;
}

export function calculatePricePoints(rank: number, rankChange: number | null) {
  const basePricePoints = calculateBasePricePoints(rank);

  if (!rankChange) {
    return basePricePoints;
  }

  const cappedRankChange = Math.max(-30, Math.min(30, rankChange));
  const coefficient = cappedRankChange > 0 ? 0.002 : 0.003;

  return Math.max(0, Math.round(basePricePoints * Math.exp(coefficient * cappedRankChange)));
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

export function resolveTier(score: number) {
  return [...TIER_DEFINITIONS]
    .reverse()
    .find((tier) => score >= tier.minScore) ?? TIER_DEFINITIONS[0];
}

export function resolveNextTier(score: number) {
  return TIER_DEFINITIONS.find((tier) => score < tier.minScore) ?? null;
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

export function toMarketVideo(signal: TrendSignalRow, canBuy = true, buyBlockedReason: string | null = null) {
  const basePricePoints = calculateBasePricePoints(signal.current_rank);
  const currentPricePoints = calculatePricePoints(signal.current_rank, signal.rank_change);
  const momentumPriceDeltaPoints = currentPricePoints - basePricePoints;

  return {
    basePricePoints,
    buyBlockedReason,
    canBuy,
    capturedAt: signal.captured_at,
    channelTitle: signal.channel_title,
    currentPricePoints,
    currentRank: signal.current_rank,
    currentViewCount: signal.current_view_count,
    isNew: signal.is_new,
    momentumPriceDeltaPercent:
      basePricePoints > 0 ? (momentumPriceDeltaPoints * 100) / basePricePoints : 0,
    momentumPriceDeltaPoints,
    momentumPriceType:
      momentumPriceDeltaPoints > 0
        ? 'PREMIUM'
        : momentumPriceDeltaPoints < 0
          ? 'DISCOUNT'
          : 'NONE',
    previousRank: signal.previous_rank,
    rankChange: signal.rank_change,
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
      viewCount:
        signal.current_view_count === null ? null : String(signal.current_view_count),
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
