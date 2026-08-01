import type { AdminTierThresholdUpdate } from '../../features/admin/types';

export interface TierThresholdDraft {
  displayName: string;
  minPoints: string;
  tierCode: string;
}

export function parseTierThresholdDrafts(
  drafts: TierThresholdDraft[],
): AdminTierThresholdUpdate[] {
  const tiers = drafts.map((draft) => {
    const normalizedPoints = draft.minPoints.trim().replace(/,/g, '');

    if (!/^\d+$/.test(normalizedPoints)) {
      throw new Error(`${draft.displayName} 기준은 0 이상의 정수만 입력할 수 있습니다.`);
    }

    const minPoints = Number(normalizedPoints);
    if (!Number.isSafeInteger(minPoints)) {
      throw new Error(`${draft.displayName} 기준이 허용 범위를 벗어났습니다.`);
    }

    return {
      minPoints,
      tierCode: draft.tierCode,
    };
  });

  if (tiers[0]?.minPoints !== 0) {
    throw new Error('첫 번째 티어 기준은 0P여야 합니다.');
  }

  for (let index = 1; index < tiers.length; index += 1) {
    if (tiers[index].minPoints <= tiers[index - 1].minPoints) {
      throw new Error('상위 티어 기준 포인트는 이전 티어보다 커야 합니다.');
    }
  }

  return tiers;
}
