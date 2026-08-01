import { describe, expect, it } from 'vitest';
import { parseTierThresholdDrafts } from './tierThresholdDraft';

describe('parseTierThresholdDrafts', () => {
  it('parses comma-formatted asset thresholds', () => {
    expect(
      parseTierThresholdDrafts([
        { displayName: '브론즈', minPoints: '0', tierCode: 'BRONZE' },
        { displayName: '실버', minPoints: '120,000', tierCode: 'SILVER' },
      ]),
    ).toEqual([
      { minPoints: 0, tierCode: 'BRONZE' },
      { minPoints: 120_000, tierCode: 'SILVER' },
    ]);
  });

  it('rejects thresholds that do not strictly increase', () => {
    expect(() =>
      parseTierThresholdDrafts([
        { displayName: '브론즈', minPoints: '0', tierCode: 'BRONZE' },
        { displayName: '실버', minPoints: '0', tierCode: 'SILVER' },
      ]),
    ).toThrow('상위 티어 기준 포인트는 이전 티어보다 커야 합니다.');
  });
});
