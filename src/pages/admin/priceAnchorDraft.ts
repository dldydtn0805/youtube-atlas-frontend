import type { AdminPriceAnchorUpdate } from '../../features/admin/types';

export interface PriceAnchorDraft {
  pricePoints: string;
  rank: number;
}

export function parsePriceAnchorDrafts(drafts: PriceAnchorDraft[]): AdminPriceAnchorUpdate[] {
  const anchors = drafts
    .map((draft) => {
      const normalizedPrice = draft.pricePoints.trim().replace(/,/g, '');

      if (!/^\d+$/.test(normalizedPrice)) {
        throw new Error(`${draft.rank}위 가격은 1 이상의 정수만 입력할 수 있습니다.`);
      }

      const pricePoints = Number(normalizedPrice);
      if (!Number.isSafeInteger(pricePoints) || pricePoints <= 0) {
        throw new Error(`${draft.rank}위 가격이 허용 범위를 벗어났습니다.`);
      }

      return {
        pricePoints,
        rank: draft.rank,
      };
    })
    .sort((left, right) => left.rank - right.rank);

  for (let index = 1; index < anchors.length; index += 1) {
    if (anchors[index].pricePoints > anchors[index - 1].pricePoints) {
      throw new Error(
        `${anchors[index].rank}위 가격은 ${anchors[index - 1].rank}위 가격보다 높을 수 없습니다.`,
      );
    }
  }

  return anchors;
}
