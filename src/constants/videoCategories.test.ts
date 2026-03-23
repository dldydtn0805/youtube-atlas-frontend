import { describe, expect, it } from 'vitest';
import { toVideoCategory } from './videoCategories';

describe('toVideoCategory', () => {
  it('maps known category ids to localized labels and descriptions', () => {
    expect(
      toVideoCategory({
        id: '20',
        snippet: {
          assignable: true,
          title: 'Gaming',
        },
      }),
    ).toEqual({
      id: '20',
      label: '게임',
      description: '게임 방송, 리뷰, 신작 반응 등 게임 카테고리 인기 영상입니다.',
    });
  });

  it('filters out categories that cannot be assigned to videos', () => {
    expect(
      toVideoCategory({
        id: '44',
        snippet: {
          assignable: false,
          title: 'Trailers',
        },
      }),
    ).toBeNull();
  });

  it('falls back to the api title for unknown categories', () => {
    expect(
      toVideoCategory({
        id: '999',
        snippet: {
          assignable: true,
          title: 'Experimental',
        },
      }),
    ).toEqual({
      id: '999',
      label: 'Experimental',
      description: 'Experimental 카테고리 인기 영상을 확인할 수 있습니다.',
    });
  });
});
