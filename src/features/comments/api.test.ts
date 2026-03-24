import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('createComment', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('normalizes message content before posting it to the backend', async () => {
    const { createComment } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        author: '익명',
        client_id: 'client-1',
        content: 'hello world',
        created_at: '2026-03-22T00:00:00.000Z',
        id: 1,
        video_id: 'video-1',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await createComment({
      author: ' ',
      clientId: 'client-1',
      content: '  hello   world  ',
      videoId: 'video-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/videos/video-1/comments',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(
      JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string),
    ).toEqual({
      author: '익명',
      clientId: 'client-1',
      content: 'hello world',
    });
  });

  it('maps cooldown API errors into a typed submission error', async () => {
    const { createComment } = await import('./api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createMockResponse(
          {
            code: 'cooldown',
            message: '채팅 흐름을 위해 4초 후에 다시 보낼 수 있어요.',
            retryAfterSeconds: 4,
          },
          409,
        ),
      ),
    );

    await expect(
      createComment({
        author: '',
        clientId: 'client-1',
        content: 'hello world',
        videoId: 'video-1',
      }),
    ).rejects.toMatchObject({
      code: 'cooldown',
      message: '채팅 흐름을 위해 4초 후에 다시 보낼 수 있어요.',
      retryAfterSeconds: 4,
    });
  });

  it('maps duplicate API errors into a typed submission error', async () => {
    const { createComment } = await import('./api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createMockResponse(
          {
            code: 'duplicate',
            message: '같은 메시지는 30초 후에 다시 보낼 수 있어요.',
            retryAfterSeconds: null,
          },
          409,
        ),
      ),
    );

    await expect(
      createComment({
        author: '',
        clientId: 'client-1',
        content: 'hello world',
        videoId: 'video-1',
      }),
    ).rejects.toMatchObject({
      code: 'duplicate',
      message: '같은 메시지는 30초 후에 다시 보낼 수 있어요.',
    });
  });
});
