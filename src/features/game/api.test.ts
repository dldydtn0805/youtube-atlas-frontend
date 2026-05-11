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
});
