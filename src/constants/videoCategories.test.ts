import { describe, expect, it } from 'vitest';
import {
  getDetailVideoCategories,
  getMainVideoCategories,
  isMainVideoCategoryId,
  sortVideoCategories,
  supportsVideoGameActions,
  supportsVideoTrendSignals,
  VIDEO_GAME_REGION_CODE,
} from './videoCategories';

describe('video category helpers', () => {
  const categories = [
    {
      id: '28',
      label: '테크',
      description: '테크',
      sourceIds: ['28'],
    },
    {
      id: '24',
      label: 'Entertainment',
      description: '엔터테인먼트',
      sourceIds: ['24'],
    },
    {
      id: '0',
      label: '전체',
      description: '전체',
      sourceIds: [],
    },
    {
      id: '10',
      label: 'Music',
      description: '음악',
      sourceIds: ['10'],
    },
    {
      id: '25',
      label: 'News & Politics',
      description: '뉴스/시사',
      sourceIds: ['25'],
    },
    {
      id: '20',
      label: 'Gaming',
      description: '게임',
      sourceIds: ['20'],
    },
  ];

  it('identifies only curated ids as main categories', () => {
    expect(isMainVideoCategoryId('0')).toBe(true);
    expect(isMainVideoCategoryId('10')).toBe(true);
    expect(isMainVideoCategoryId('24')).toBe(false);
  });

  it('allows trend signals only for the all category in the game region', () => {
    expect(supportsVideoTrendSignals('0', VIDEO_GAME_REGION_CODE)).toBe(true);
    expect(supportsVideoTrendSignals('0', 'US')).toBe(false);
    expect(supportsVideoTrendSignals('28', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoTrendSignals('10', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoTrendSignals('24', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoTrendSignals(undefined, VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoTrendSignals('0', undefined)).toBe(false);
  });

  it('allows game actions only for the all category in the game region', () => {
    expect(supportsVideoGameActions('0', VIDEO_GAME_REGION_CODE)).toBe(true);
    expect(supportsVideoGameActions('0', 'US')).toBe(false);
    expect(supportsVideoGameActions('28', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoGameActions('10', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoGameActions('24', VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoGameActions(undefined, VIDEO_GAME_REGION_CODE)).toBe(false);
    expect(supportsVideoGameActions('0', undefined)).toBe(false);
  });

  it('sorts categories with the all category first', () => {
    expect(sortVideoCategories(categories).map((category) => category.id)).toEqual([
      '0',
      '28',
      '24',
      '20',
      '10',
      '25',
    ]);
  });

  it('returns curated main categories in fixed display order', () => {
    expect(getMainVideoCategories(categories).map((category) => category.id)).toEqual([
      '0',
      '10',
      '20',
      '25',
      '28',
    ]);
  });

  it('returns the remaining categories as detail categories', () => {
    expect(getDetailVideoCategories(categories).map((category) => category.id)).toEqual(['24']);
  });
});
