import { useInfiniteQuery } from "@tanstack/react-query";
import type { YouTubeCategorySection } from "../youtube/types";
import { fetchYouTubeLikedVideos } from "./api";

function providerTokenFingerprint(token: string | null) {
  if (!token) {
    return "none";
  }

  let hash = 2166136261;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${token.length}:${hash >>> 0}`;
}

export function youtubeLikedVideosQueryKey(
  accessToken: string | null,
  googleAccessToken: string | null,
) {
  return [
    "youtubeLikedVideos",
    accessToken,
    providerTokenFingerprint(googleAccessToken),
  ] as const;
}

export function useYouTubeLikedVideos(
  accessToken: string | null,
  googleAccessToken: string | null,
  enabled = true,
) {
  return useInfiniteQuery({
    enabled: enabled && Boolean(accessToken && googleAccessToken),
    queryKey: youtubeLikedVideosQueryKey(accessToken, googleAccessToken),
    queryFn: ({ pageParam }) =>
      fetchYouTubeLikedVideos(
        accessToken as string,
        googleAccessToken as string,
        pageParam,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: YouTubeCategorySection) =>
      lastPage.nextPageToken,
    retry: false,
    staleTime: 1000 * 30,
  });
}
