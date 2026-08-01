import { describe, expect, it, vi } from "vitest";
import { fetchYouTubeLikedVideos } from "./youtube-liked-videos.ts";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("YouTube liked videos", () => {
  it("loads the current account liked videos with pagination", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response({
        items: [
          {
            contentDetails: { duration: "PT3M" },
            id: "video-1",
            snippet: {
              categoryId: "10",
              channelId: "channel-1",
              channelTitle: "Channel One",
              thumbnails: {
                default: {
                  height: 90,
                  url: "https://example.com/default.jpg",
                  width: 120,
                },
                high: {
                  height: 360,
                  url: "https://example.com/high.jpg",
                  width: 480,
                },
                medium: {
                  height: 180,
                  url: "https://example.com/medium.jpg",
                  width: 320,
                },
              },
              title: "Liked video",
            },
            statistics: { viewCount: "123" },
          },
        ],
        nextPageToken: "next-page",
      }),
    );

    const result = await fetchYouTubeLikedVideos(
      "google-token",
      "page/one",
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://www.googleapis.com/youtube/v3/videos?maxResults=50&myRating=like&part=snippet%2CcontentDetails%2Cstatistics&pageToken=page%2Fone",
      { headers: { Authorization: "Bearer google-token" } },
    );
    expect(result).toMatchObject({
      categoryId: "youtube-liked-videos",
      items: [{ id: "video-1", statistics: { viewCount: "123" } }],
      nextPageToken: "next-page",
    });
  });

  it("turns missing YouTube scope into a reconnectable error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      response(
        {
          error: {
            errors: [{ reason: "insufficientPermissions" }],
            message: "Insufficient Permission",
          },
        },
        403,
      ),
    );

    await expect(
      fetchYouTubeLikedVideos("identity-token", null, fetcher),
    ).rejects.toMatchObject({
      code: "youtube_permission_required",
      status: 403,
    });
  });
});
