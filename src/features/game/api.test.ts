import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const url = 'https://api.example.com/api/game/market?regionCode=KR';
const emptyResponse = { ok: true, status: 200, text: async () => '[]' } as Response;

describe('fetchGameMarket', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses auth only for personalization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResponse);
    const { fetchGameMarket } = await import('./api');

    vi.stubGlobal('fetch', fetchMock);

    await fetchGameMarket(null, 'KR');

    expect(fetchMock).toHaveBeenCalledWith(url, undefined);
    fetchMock.mockClear();

    await fetchGameMarket('token', 'KR');

    expect(fetchMock).toHaveBeenCalledWith(url, {
      headers: { Authorization: 'Bearer token' },
    });
  });

  it('normalizes the priority account response used during initial login', async () => {
    const wallet = {
      balancePoints: 12000,
      realizedPnlPoints: 2000,
      reservedPoints: 0,
      seasonId: 3,
      totalAssetPoints: 15000,
    };
    const tier = {
      badgeCode: 'earth',
      displayName: '지구',
      inventorySlots: null,
      minScore: null,
      profileThemeCode: 'earth',
      tierCode: 'EARTH',
      titleCode: 'earth',
    };
    const apiResponse = {
      currentSeason: {
        endAt: '2026-09-01T00:00:00.000Z',
        inventorySlots: null,
        maxOpenPositions: 5,
        minHoldSeconds: 60,
        rankPointMultiplier: 100,
        regionCode: 'KR',
        seasonId: 3,
        seasonName: '시즌 3',
        startAt: '2026-08-01T00:00:00.000Z',
        startingBalancePoints: 10000,
        status: 'ACTIVE',
        wallet,
      },
      openPositions: [],
      positionHistory: [],
      tierProgress: {
        currentTier: tier,
        nextTier: null,
        regionCode: 'KR',
        seasonId: 3,
        seasonName: '시즌 3',
        tiers: [tier],
        totalAssetPoints: 15000,
      },
      updatedAt: '2026-08-02T00:00:00.000Z',
      wallet,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(apiResponse),
    } as Response);
    const { fetchGameAccountState } = await import('./api');

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchGameAccountState('token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/game/account-state',
      {
        headers: { Authorization: 'Bearer token' },
      },
    );
    expect(result.currentSeason).toEqual(
      expect.objectContaining({
        inventorySlots: expect.objectContaining({
          baseSlots: 5,
          totalSlots: 5,
        }),
        scheduledSellDefaultProfitRatePercent: 300,
        scheduledSellProfitRatePresets: [300, 500, 1000],
        wallet,
      }),
    );
    expect(result.tierProgress.currentTier).toEqual(
      expect.objectContaining({
        inventorySlots: 5,
        minScore: 0,
      }),
    );
  });
});
