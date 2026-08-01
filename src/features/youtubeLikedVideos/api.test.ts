import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("YouTube liked videos api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests the current YouTube account liked videos with pagination", async () => {
    const { fetchYouTubeLikedVideos } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        categoryId: "youtube-liked-videos",
        description: "liked videos",
        items: [],
        label: "좋아요",
        nextPageToken: "next-page",
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await fetchYouTubeLikedVideos("access-token", "google-token", "next/page");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/me/youtube-liked-videos?pageToken=next%2Fpage",
      {
        headers: {
          Authorization: "Bearer access-token",
          "X-Google-Access-Token": "google-token",
        },
      },
    );
  });
});
