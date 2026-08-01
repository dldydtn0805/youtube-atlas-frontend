import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PENDING_LIKED_VIDEOS_VIEW_KEY } from "../../app/homeRoute";
import YouTubeLikedVideosConnectAction from "./YouTubeLikedVideosConnectAction";

const authState = vi.hoisted(() => ({
  googleProviderAccessToken: null as string | null,
  isLoggingIn: false,
  requestYouTubeAccess: vi.fn<() => Promise<void>>(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => authState,
}));

describe("YouTubeLikedVideosConnectAction", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/kr/liked");
    authState.googleProviderAccessToken = null;
    authState.isLoggingIn = false;
    authState.requestYouTubeAccess.mockReset().mockResolvedValue(undefined);
    window.sessionStorage.clear();
  });

  it("requests contextual YouTube access and preserves the liked view across the redirect", async () => {
    render(
      <YouTubeLikedVideosConnectAction isVisible requiresReconnect={false} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "YouTube 좋아요 목록 연결" }),
    );

    await waitFor(() => {
      expect(authState.requestYouTubeAccess).toHaveBeenCalledWith(
        window.location.href,
      );
    });
    expect(window.sessionStorage.getItem(PENDING_LIKED_VIDEOS_VIEW_KEY)).toBe(
      "true",
    );
  });

  it("shows a reconnect action when the current Google token lacks YouTube permission", () => {
    authState.googleProviderAccessToken = "provider-token";

    render(<YouTubeLikedVideosConnectAction isVisible requiresReconnect />);

    expect(
      screen.getByRole("button", { name: "YouTube 다시 연결" }),
    ).toBeEnabled();
  });

  it("stays hidden after a working YouTube connection is available", () => {
    authState.googleProviderAccessToken = "provider-token";

    render(
      <YouTubeLikedVideosConnectAction isVisible requiresReconnect={false} />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
