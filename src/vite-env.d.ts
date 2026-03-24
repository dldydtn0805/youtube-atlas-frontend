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
    loadVideoById: (videoId: string) => void;
    stopVideo: () => void;
  }

  interface PlayerStateStatic {
    ENDED: number;
  }

  interface PlayerConstructor {
    new (element: HTMLElement, options?: PlayerOptions): Player;
  }
}

interface Window {
  onYouTubeIframeAPIReady?: () => void;
  YT?: {
    Player: YT.PlayerConstructor;
    PlayerState: YT.PlayerStateStatic;
  };
}
