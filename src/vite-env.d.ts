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
  google?: {
    accounts?: {
      id: {
        disableAutoSelect?: () => void;
        initialize: (configuration: {
          auto_select?: boolean;
          callback: (response: { credential?: string }) => void;
          cancel_on_tap_outside?: boolean;
          client_id: string;
          ux_mode?: 'popup' | 'redirect';
        }) => void;
        renderButton: (
          element: HTMLElement,
          options: {
            logo_alignment?: 'left' | 'center';
            shape?: 'pill' | 'rectangular';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            text?: 'continue_with' | 'signin_with';
            theme?: 'filled_black' | 'filled_blue' | 'outline';
            width?: number;
          },
        ) => void;
      };
    };
  };
  onYouTubeIframeAPIReady?: () => void;
  YT?: {
    Player: YT.PlayerConstructor;
    PlayerState: YT.PlayerStateStatic;
  };
}
