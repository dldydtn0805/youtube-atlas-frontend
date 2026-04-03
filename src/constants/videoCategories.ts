export interface VideoCategory {
  id: string;
  label: string;
  description: string;
  sourceIds: string[];
}

export const ALL_VIDEO_CATEGORY_ID = '0';
export const VIDEO_GAME_REGION_CODE = 'KR';
export const MAIN_VIDEO_CATEGORY_IDS = [
  ALL_VIDEO_CATEGORY_ID,
  '10',
  '20',
  '25',
  '28',
] as const;

const MAIN_VIDEO_CATEGORY_ORDER = new Map<string, number>(
  MAIN_VIDEO_CATEGORY_IDS.map((categoryId, index) => [categoryId, index]),
);

function compareCategories(left: VideoCategory, right: VideoCategory) {
  if (left.id === ALL_VIDEO_CATEGORY_ID) {
    return -1;
  }

  if (right.id === ALL_VIDEO_CATEGORY_ID) {
    return 1;
  }

  return left.label.localeCompare(right.label, 'ko');
}

export function sortVideoCategories(categories: VideoCategory[]) {
  return [...categories].sort(compareCategories);
}

export function isMainVideoCategoryId(categoryId: string) {
  return MAIN_VIDEO_CATEGORY_ORDER.has(categoryId);
}

export function supportsVideoTrendSignals(categoryId?: string, regionCode?: string) {
  return categoryId === ALL_VIDEO_CATEGORY_ID && regionCode?.toUpperCase() === VIDEO_GAME_REGION_CODE;
}

export function supportsVideoGameActions(categoryId?: string, regionCode?: string) {
  return categoryId === ALL_VIDEO_CATEGORY_ID && regionCode?.toUpperCase() === VIDEO_GAME_REGION_CODE;
}

export function getMainVideoCategories(categories: VideoCategory[]) {
  return categories
    .filter((category) => isMainVideoCategoryId(category.id))
    .sort((left, right) => {
      const leftIndex = MAIN_VIDEO_CATEGORY_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = MAIN_VIDEO_CATEGORY_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      return leftIndex - rightIndex;
    });
}

export function getDetailVideoCategories(categories: VideoCategory[]) {
  return sortVideoCategories(categories.filter((category) => !isMainVideoCategoryId(category.id)));
}
