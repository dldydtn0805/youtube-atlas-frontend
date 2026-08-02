import { describe, expect, it } from 'vitest';
import { createGameMarketSyncEvent } from './gameMarketSyncEvent';

describe('createGameMarketSyncEvent', () => {
  it('creates one market event from a completed main-chart run', () => {
    expect(
      createGameMarketSyncEvent({
        captured_at: '2026-08-02T07:07:00Z',
        category_id: '0',
        completed_at: '2026-08-02T07:07:12Z',
        region_code: 'kr',
      }),
    ).toEqual({
      capturedAt: '2026-08-02T07:07:00Z',
      eventType: 'market-updated',
      occurredAt: '2026-08-02T07:07:12Z',
      regionCode: 'KR',
      seasonId: null,
    });
  });

  it('ignores incomplete and non-main chart runs', () => {
    expect(
      createGameMarketSyncEvent({
        captured_at: '2026-08-02T07:07:00Z',
        category_id: '0',
        completed_at: null,
        region_code: 'KR',
      }),
    ).toBeNull();
    expect(
      createGameMarketSyncEvent({
        captured_at: '2026-08-02T07:07:00Z',
        category_id: '10',
        completed_at: '2026-08-02T07:07:12Z',
        region_code: 'KR',
      }),
    ).toBeNull();
  });
});
