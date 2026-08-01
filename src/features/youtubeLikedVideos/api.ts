import { fetchApi } from "../../lib/api";
import type { YouTubeCategorySection } from "../youtube/types";

function getHeaders(accessToken: string, googleAccessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Google-Access-Token": googleAccessToken,
  };
}

export function fetchYouTubeLikedVideos(
  accessToken: string,
  googleAccessToken: string,
  pageToken?: string,
) {
  const params = new URLSearchParams();

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const query = params.size > 0 ? `?${params.toString()}` : "";

  return fetchApi<YouTubeCategorySection>(
    `/api/me/youtube-liked-videos${query}`,
    {
      headers: getHeaders(accessToken, googleAccessToken),
    },
  );
}
