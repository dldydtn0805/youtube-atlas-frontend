import { describe, expect, it } from "vitest";
import type { TrendSignalRow } from "../../_shared/game.ts";
import {
  findUnavailableMusicVideoIds,
  normalizeMusicPlaylistExportInput,
} from "./music-playlist-export.ts";

function createSignal(currentRank: number, channelId: string): TrendSignalRow {
  return {
    captured_at: "2026-07-31T00:00:00.000Z",
    category_id: "0",
    category_label: "전체",
    channel_id: channelId,
    channel_title: `채널 ${channelId}`,
    current_rank: currentRank,
    current_view_count: currentRank * 1_000,
    is_new: false,
    previous_rank: currentRank + 1,
    previous_view_count: null,
    rank_change: 1,
    region_code: "KR",
    sync_buy_count: 0,
    sync_buy_quantity: 0,
    sync_sell_count: 0,
    sync_sell_quantity: 0,
    thumbnail_url: `https://example.com/${currentRank}.jpg`,
    title: `영상 ${currentRank}`,
    video_id: `video-${currentRank}`,
    view_count_delta: null,
  };
}

describe("music playlist export validation", () => {
  it("accepts up to 20 unique videos and normalizes the region", () => {
    expect(
      normalizeMusicPlaylistExportInput({
        regionCode: "kr",
        title: " 음악 TOP 2 ",
        videoIds: ["video-1", "video-2"],
      }),
    ).toEqual({
      regionCode: "KR",
      title: "음악 TOP 2",
      videoIds: ["video-1", "video-2"],
    });
  });

  it("rejects duplicates before they consume YouTube write quota", () => {
    expect(() =>
      normalizeMusicPlaylistExportInput({
        regionCode: "KR",
        title: "음악 TOP 2",
        videoIds: ["video-1", "video-1"],
      }),
    ).toThrow("중복된 영상");
  });

  it("only permits videos in the current synced music chart", () => {
    const musicSignal = {
      ...createSignal(1, "channel-a"),
      video_category_id: "10",
    };
    const gameSignal = {
      ...createSignal(2, "channel-b"),
      video_category_id: "20",
    };

    expect(
      findUnavailableMusicVideoIds(
        [musicSignal, gameSignal],
        ["video-1", "video-2"],
      ),
    ).toEqual(["video-2"]);
  });
});
