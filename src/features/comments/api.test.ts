import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_SESSION_STORAGE_KEY = 'youtube-atlas-auth-session';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function writeStoredAuthSession(accessToken = 'access-token-1') {
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken,
      expiresAt: '2026-03-23T00:00:00.000Z',
      tokenType: 'Bearer',
      user: {
        commentCount: 0,
        createdAt: '2026-03-22T00:00:00.000Z',
        displayName: 'Atlas User',
        email: 'atlas@example.com',
        favoriteCount: 0,
        id: 7,
        lastLoginAt: '2026-03-22T00:00:00.000Z',
        pictureUrl: null,
        tradeCount: 0,
      },
    }),
  );
}

describe('createComment', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('normalizes message content before posting it to the backend', async () => {
    writeStoredAuthSession();
    const { createComment } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        author: '익명',
        client_id: 'client-1',
        content: 'hello world',
        created_at: '2026-03-22T00:00:00.000Z',
        id: 1,
        video_id: 'global',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await createComment({
      author: ' ',
      clientId: 'client-1',
      content: '  hello   world  ',
      regionCode: 'KR',
      videoId: 'video-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/comments',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
        }),
        method: 'POST',
      }),
    );
    expect(
      JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string),
    ).toEqual({
      author: '익명',
      clientId: 'client-1',
      content: 'hello world',
      regionCode: 'KR',
    });
  });

  it('rejects anonymous comment creation before calling the backend', async () => {
    const { createComment } = await import('./api');
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createComment({
        author: '',
        clientId: 'client-1',
        content: 'hello world',
        videoId: 'video-1',
      }),
    ).rejects.toMatchObject({
      code: 'auth',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps cooldown API errors into a typed submission error', async () => {
    writeStoredAuthSession();
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
    writeStoredAuthSession();
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

  it('requests comments for the selected game region', async () => {
    const { fetchComments } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(createMockResponse([]));

    vi.stubGlobal('fetch', fetchMock);

    await fetchComments('KR');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/comments?regionCode=KR', undefined);
  });

  it('requests public comment highlights for the selected video', async () => {
    const { fetchCommentHighlights } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(createMockResponse([]));

    vi.stubGlobal('fetch', fetchMock);

    await fetchCommentHighlights('video/1');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/videos/video%2F1/comment-highlights',
      undefined,
    );
  });

  it('posts the current chat participant id when syncing presence identity', async () => {
    const { updateCommentPresenceIdentity } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        active_count: 1,
        participants: [
          {
            display_name: 'Atlas User',
            participant_id: 'client-1',
          },
        ],
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await updateCommentPresenceIdentity({
      accessToken: 'access-token-1',
      clientId: 'client-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/comments/presence/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token-1',
        }),
        method: 'POST',
      }),
    );
    expect(
      JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string),
    ).toEqual({
      clientId: 'client-1',
    });
  });
});
