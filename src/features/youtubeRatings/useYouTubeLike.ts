import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { ApiRequestError } from "../../lib/api";
import { fetchYouTubeVideoRating, updateYouTubeVideoRating } from "./api";
import {
  clearPendingYouTubeRating,
  readPendingYouTubeRating,
  writePendingYouTubeRating,
} from "./pendingRating";
import type { YouTubeVideoRating, YouTubeVideoRatingResult } from "./types";

type YouTubeLikePhase =
  "idle" | "authorizing" | "updating" | "success" | "error";

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

function youtubeRatingQueryKey(
  accessToken: string | null,
  googleProviderAccessToken: string | null,
  videoId?: string,
) {
  return [
    "youtubeVideoRating",
    accessToken,
    providerTokenFingerprint(googleProviderAccessToken),
    videoId,
  ] as const;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError || error instanceof Error) {
    return error.message;
  }

  return "YouTube 좋아요를 반영하지 못했습니다.";
}

function shouldRequestYouTubeAccess(error: unknown) {
  return (
    error instanceof ApiRequestError &&
    (error.code === "youtube_authorization_required" ||
      error.code === "youtube_authorization_expired" ||
      error.code === "youtube_permission_required")
  );
}

export default function useYouTubeLike(videoId?: string, isKnownLiked = false) {
  const {
    accessToken,
    googleProviderAccessToken,
    requestYouTubeAccess,
    status: authStatus,
  } = useAuth();
  const queryClient = useQueryClient();
  const oauthRedirectInFlightRef = useRef(false);
  const resumedRatingRef = useRef(false);
  const initialPendingRating = useRef(readPendingYouTubeRating());
  const [message, setMessage] = useState<string | null>(() =>
    initialPendingRating.current ? "YouTube 연결을 확인하고 있습니다." : null,
  );
  const [phase, setPhase] = useState<YouTubeLikePhase>(() =>
    initialPendingRating.current ? "authorizing" : "idle",
  );
  const [isResumingPending, setIsResumingPending] = useState(
    Boolean(initialPendingRating.current),
  );

  const ratingQuery = useQuery({
    enabled:
      authStatus === "authenticated" &&
      Boolean(accessToken && googleProviderAccessToken && videoId) &&
      !isKnownLiked &&
      !isResumingPending,
    queryFn: () =>
      fetchYouTubeVideoRating(
        accessToken as string,
        googleProviderAccessToken as string,
        videoId as string,
      ),
    queryKey: youtubeRatingQueryKey(
      accessToken,
      googleProviderAccessToken,
      videoId,
    ),
    retry: false,
    staleTime: 30 * 1000,
  });

  const ratingMutation = useMutation({
    mutationFn: async ({
      rating,
      videoId: targetVideoId,
    }: {
      rating: YouTubeVideoRating;
      videoId: string;
    }) => {
      if (!accessToken || !googleProviderAccessToken) {
        throw new ApiRequestError("YouTube 연결이 필요합니다.", {
          code: "youtube_authorization_required",
          status: 401,
        });
      }

      return updateYouTubeVideoRating(
        accessToken,
        googleProviderAccessToken,
        targetVideoId,
        rating,
      );
    },
    onSuccess: (result) => {
      queryClient.setQueryData<YouTubeVideoRatingResult>(
        youtubeRatingQueryKey(
          accessToken,
          googleProviderAccessToken,
          result.videoId,
        ),
        result,
      );
      void queryClient.invalidateQueries({ queryKey: ["youtubeLikedVideos"] });
    },
  });

  const applyRating = useCallback(
    async (
      targetVideoId: string,
      rating: YouTubeVideoRating,
      canRequestAccess: boolean,
    ) => {
      setPhase("updating");
      setMessage(
        rating === "like"
          ? "YouTube 계정에 좋아요를 반영하고 있습니다."
          : "YouTube 계정의 좋아요를 취소하고 있습니다.",
      );

      try {
        await ratingMutation.mutateAsync({ rating, videoId: targetVideoId });
        setPhase("success");
        setMessage(
          rating === "like"
            ? "YouTube 계정의 좋아요 표시한 동영상에 추가했습니다."
            : "YouTube 계정의 좋아요를 취소했습니다.",
        );
      } catch (error) {
        if (canRequestAccess && shouldRequestYouTubeAccess(error)) {
          oauthRedirectInFlightRef.current = true;
          writePendingYouTubeRating({
            rating,
            requestedAt: Date.now(),
            videoId: targetVideoId,
          });
          setPhase("authorizing");
          setMessage("YouTube 좋아요 권한을 요청하고 있습니다.");

          try {
            await requestYouTubeAccess(window.location.origin);
          } catch (oauthError) {
            oauthRedirectInFlightRef.current = false;
            clearPendingYouTubeRating();
            setPhase("error");
            setMessage(getErrorMessage(oauthError));
          }
          return;
        }

        setPhase("error");
        setMessage(getErrorMessage(error));
      }
    },
    [ratingMutation, requestYouTubeAccess],
  );

  useEffect(() => {
    if (phase !== "success" || !message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
      setPhase("idle");
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [message, phase]);

  useEffect(() => {
    const pendingRating = readPendingYouTubeRating();

    if (!pendingRating) {
      if (isResumingPending) {
        setIsResumingPending(false);
      }
      return;
    }

    if (oauthRedirectInFlightRef.current || resumedRatingRef.current) {
      return;
    }

    if (authStatus === "loading") {
      return;
    }

    if (
      authStatus !== "authenticated" ||
      !accessToken ||
      !googleProviderAccessToken
    ) {
      clearPendingYouTubeRating();
      setIsResumingPending(false);
      setPhase("error");
      setMessage("YouTube 연결이 완료되지 않았습니다. 다시 시도해 주세요.");
      return;
    }

    resumedRatingRef.current = true;
    void applyRating(
      pendingRating.videoId,
      pendingRating.rating,
      false,
    ).finally(() => {
      clearPendingYouTubeRating();
      setIsResumingPending(false);
    });
  }, [
    accessToken,
    applyRating,
    authStatus,
    googleProviderAccessToken,
    isResumingPending,
  ]);

  const isLiked =
    ratingQuery.data?.rating === "like" ||
    (ratingQuery.data === undefined && isKnownLiked);
  const isPending = phase === "authorizing" || phase === "updating";
  const toggleLike = useCallback(() => {
    if (!videoId || authStatus !== "authenticated" || isPending) {
      return;
    }

    void applyRating(videoId, isLiked ? "none" : "like", true);
  }, [applyRating, authStatus, isLiked, isPending, videoId]);

  return useMemo(
    () => ({
      authStatus,
      isLiked,
      isPending,
      message,
      phase,
      toggleLike,
    }),
    [authStatus, isLiked, isPending, message, phase, toggleLike],
  );
}
