/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_YOUTUBE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace YT {
  interface OnReadyEvent {
    target: Player;
  }

  interface OnStateChangeEvent {
    data: number;
  }

  interface PlayerEvents {
    onReady?: (event: OnReadyEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
  }

  interface PlayerOptions {
    height?: string;
    width?: string;
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: PlayerEvents;
  }

  interface Player {
    destroy: () => void;
    getCurrentTime: () => number;
    getPlayerState: () => number;
    getVideoData: () => {
      video_id?: string;
    };
    loadVideoById: (videoId: string | VideoByIdSettings) => void;
    seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
    stopVideo: () => void;
  }

  interface VideoByIdSettings {
    videoId: string;
    startSeconds?: number;
  }

  interface PlayerStateStatic {
    PAUSED: number;
    PLAYING: number;
    ENDED: number;
  }

  interface PlayerConstructor {
    new (element: HTMLElement, options?: PlayerOptions): Player;
  }
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initCodeClient: (configuration: {
          callback: (response: {
            code?: string;
            error?: string;
            error_description?: string;
          }) => void;
          client_id: string;
          error_callback?: (error: {
            type: 'popup_closed' | 'popup_failed_to_open' | 'unknown';
          }) => void;
          scope: string;
          select_account?: boolean;
          ux_mode?: 'popup' | 'redirect';
        }) => {
          requestCode: () => void;
        };
      };
    };
  };
  onYouTubeIframeAPIReady?: () => void;
  YT?: {
    Player: YT.PlayerConstructor;
    PlayerState: YT.PlayerStateStatic;
  };
}
