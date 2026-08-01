import { useState } from "react";
import { PENDING_LIKED_VIDEOS_VIEW_KEY } from "../../app/homeRoute";
import { useAuth } from "../auth/useAuth";
import "./YouTubeLikedVideosConnectAction.css";

interface YouTubeLikedVideosConnectActionProps {
  isVisible: boolean;
  requiresReconnect: boolean;
}

export default function YouTubeLikedVideosConnectAction({
  isVisible,
  requiresReconnect,
}: YouTubeLikedVideosConnectActionProps) {
  const { googleProviderAccessToken, isLoggingIn, requestYouTubeAccess } =
    useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const needsConnection = !googleProviderAccessToken || requiresReconnect;

  if (!isVisible || !needsConnection) {
    return null;
  }

  const handleConnect = async () => {
    setErrorMessage(null);
    window.sessionStorage.setItem(PENDING_LIKED_VIDEOS_VIEW_KEY, "true");

    try {
      await requestYouTubeAccess(window.location.origin);
    } catch (error) {
      window.sessionStorage.removeItem(PENDING_LIKED_VIDEOS_VIEW_KEY);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "YouTube 연결을 시작하지 못했습니다.",
      );
    }
  };

  return (
    <div className="youtube-liked-videos-connect">
      <button
        className="youtube-liked-videos-connect__button"
        disabled={isLoggingIn}
        onClick={() => void handleConnect()}
        type="button"
      >
        <span aria-hidden="true">▶</span>
        {isLoggingIn
          ? "YouTube 연결 중"
          : requiresReconnect
            ? "YouTube 다시 연결"
            : "YouTube 좋아요 목록 연결"}
      </button>
      {errorMessage ? (
        <p className="youtube-liked-videos-connect__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
