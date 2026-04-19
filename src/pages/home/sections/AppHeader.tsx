import { useEffect, useRef, useState } from 'react';
import GoogleLoginButton from '../../../components/GoogleLoginButton/GoogleLoginButton';
import type { AuthStatus, AuthUser } from '../../../features/auth/types';
import { formatPoints } from '../gameHelpers';
import './AppHeader.css';

interface AppHeaderProps {
  authStatus: AuthStatus;
  currentTierCode?: string | null;
  currentTierName?: string | null;
  isDarkMode: boolean;
  isLoggingOut: boolean;
  onLogout: () => void;
  onOpenGameModal?: () => void;
  onOpenRecentPlayback?: (videoId: string) => void;
  onRefreshProfile?: () => Promise<void>;
  onOpenTierModal?: () => void;
  onOpenWalletModal?: () => void;
  onToggleThemeMode: () => void;
  themeToggleLabel: string;
  user?: AuthUser | null;
  walletBalancePoints?: number | null;
}

function ThemeToggleIcon({ isDarkMode }: { isDarkMode: boolean }) {
  if (isDarkMode) {
    return (
      <svg
        aria-hidden="true"
        className="app-shell__theme-toggle-icon"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M14.5 3.5a7.5 7.5 0 1 0 6 12 8.5 8.5 0 1 1-6-12Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="app-shell__theme-toggle-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" fill="currentColor" r="4.5" />
      <path
        d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const profileDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatProfileDateTime(value?: string | null) {
  if (!value) {
    return '정보 없음';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '정보 없음';
  }

  return profileDateFormatter.format(parsed);
}

function formatAtlasDays(value?: string | null) {
  if (!value) {
    return '정보 없음';
  }

  const joinedAt = new Date(value);
  if (Number.isNaN(joinedAt.getTime())) {
    return '정보 없음';
  }

  const elapsedMilliseconds = Date.now() - joinedAt.getTime();
  const elapsedDays = Math.max(0, Math.floor(elapsedMilliseconds / 86_400_000));

  return `+ ${elapsedDays}일`;
}

function formatPlaybackPosition(seconds?: number | null) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '정보 없음';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function AppHeader({
  authStatus,
  currentTierCode,
  currentTierName,
  isDarkMode,
  isLoggingOut,
  onLogout,
  onOpenGameModal,
  onOpenRecentPlayback,
  onRefreshProfile,
  onOpenTierModal,
  onOpenWalletModal,
  onToggleThemeMode,
  themeToggleLabel,
  user,
  walletBalancePoints,
}: AppHeaderProps) {
  const userIdentityLabel = user?.displayName || user?.email || 'Google 계정';
  const walletSummary =
    typeof walletBalancePoints === 'number' && Number.isFinite(walletBalancePoints)
      ? formatPoints(walletBalancePoints)
      : '집계 중';
  const tierSummary = currentTierName?.trim() || '미정';
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const profileCardRef = useRef<HTMLDivElement | null>(null);
  const profileButtonLabel = `${userIdentityLabel} 프로필 정보 열기`;
  const playbackProgress = user?.lastPlaybackProgress ?? null;
  const recentPlaybackProgresses =
    user?.recentPlaybackProgresses && user.recentPlaybackProgresses.length > 0
      ? user.recentPlaybackProgresses.slice(0, 5)
      : playbackProgress
        ? [playbackProgress]
        : [];

  const handleProfileButtonClick = async () => {
    if (!isProfileCardOpen) {
      try {
        await onRefreshProfile?.();
      } catch {
        // Keep the profile card usable even if the background refresh fails.
      }
    }

    setIsProfileCardOpen((current) => !current);
  };

  useEffect(() => {
    if (!isProfileCardOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!profileCardRef.current?.contains(event.target)) {
        setIsProfileCardOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileCardOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileCardOpen]);

  return (
    <header className="app-shell__header">
      <div className="app-shell__header-top">
        <a className="app-shell__title-link" href="/" aria-label="YouTube Atlas 메인 페이지로 이동">
          <h1 className="app-shell__title">YouTube Atlas</h1>
        </a>
        <div className="app-shell__header-actions">
          {authStatus === 'authenticated' && user ? (
            <div className="app-shell__auth-summary" aria-label="내 지갑 및 티어">
              <button
                aria-label="지갑 현황 열기"
                className="app-shell__auth-summary-item app-shell__auth-summary-item--button"
                onClick={onOpenWalletModal}
                type="button"
              >
                <span className="app-shell__auth-summary-label">잔액</span>
                <strong className="app-shell__auth-summary-value">{walletSummary}</strong>
              </button>
              <button
                aria-label="티어 현황 열기"
                className="app-shell__auth-summary-item app-shell__auth-summary-item--button"
                data-tier-code={currentTierCode ?? undefined}
                onClick={onOpenTierModal}
                type="button"
              >
                <span className="app-shell__auth-summary-label">티어</span>
                <strong className="app-shell__auth-summary-value">{tierSummary}</strong>
              </button>
              <button
                aria-label="내 게임 열기"
                className="app-shell__auth-summary-item app-shell__auth-summary-item--button app-shell__auth-summary-item--game"
                data-tier-code={currentTierCode ?? undefined}
                onClick={onOpenGameModal}
                type="button"
              >
                <span className="app-shell__auth-summary-label">내 게임</span>
              </button>
            </div>
          ) : null}
          <button
            aria-label={themeToggleLabel}
            aria-pressed={isDarkMode}
            className="app-shell__theme-toggle"
            data-active={isDarkMode}
            onClick={onToggleThemeMode}
            type="button"
          >
            <ThemeToggleIcon isDarkMode={isDarkMode} />
          </button>
          {authStatus === 'authenticated' && user ? (
            <div className="app-shell__auth-session" ref={profileCardRef}>
              <button
                aria-expanded={isProfileCardOpen}
                aria-haspopup="dialog"
                aria-label={profileButtonLabel}
                className="app-shell__auth-avatar-button"
                onClick={() => void handleProfileButtonClick()}
                title={profileButtonLabel}
                type="button"
              >
                {user.pictureUrl ? (
                  <img
                    alt={`${userIdentityLabel} 프로필`}
                    className="app-shell__auth-avatar"
                    src={user.pictureUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="app-shell__auth-avatar app-shell__auth-avatar--fallback"
                  >
                    {userIdentityLabel.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
              {isProfileCardOpen ? (
                <div className="app-shell__profile-card" role="dialog" aria-label="내 프로필 정보">
                  <div className="app-shell__profile-card-header">
                    {user.pictureUrl ? (
                      <img
                        alt={`${userIdentityLabel} 프로필`}
                        className="app-shell__profile-card-avatar"
                        src={user.pictureUrl}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="app-shell__profile-card-avatar app-shell__auth-avatar--fallback"
                      >
                        {userIdentityLabel.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="app-shell__profile-card-identity">
                      <strong>{user.displayName || '이름 없음'}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <div className="app-shell__profile-card-grid">
                    <p>
                      <span>Atlas에 함께한지</span>
                      <strong>{formatAtlasDays(user.createdAt)}</strong>
                    </p>
                    <p>
                      <span>즐겨찾기</span>
                      <strong>{user.favoriteCount}명</strong>
                    </p>
                    <p>
                      <span>댓글</span>
                      <strong>{user.commentCount}회</strong>
                    </p>
                    <p>
                      <span>거래</span>
                      <strong>{user.tradeCount}회</strong>
                    </p>
                  </div>
                  <div className="app-shell__profile-card-section">
                    <span className="app-shell__profile-card-section-label">최근 재생</span>
                    {recentPlaybackProgresses.length > 0 ? (
                      <div className="app-shell__profile-card-playback-list">
                        {recentPlaybackProgresses.map((recentPlaybackProgress) => (
                          <div
                            className="app-shell__profile-card-playback"
                            key={`${recentPlaybackProgress.videoId}-${recentPlaybackProgress.updatedAt}`}
                          >
                            {recentPlaybackProgress.thumbnailUrl ? (
                              typeof onOpenRecentPlayback === 'function' ? (
                                <button
                                  aria-label={`${recentPlaybackProgress.videoTitle ?? recentPlaybackProgress.videoId} 영상으로 이동`}
                                  className="app-shell__profile-card-playback-thumb-button"
                                  onClick={() => {
                                    setIsProfileCardOpen(false);
                                    onOpenRecentPlayback(recentPlaybackProgress.videoId);
                                  }}
                                  type="button"
                                >
                                  <img
                                    alt=""
                                    className="app-shell__profile-card-playback-thumb"
                                    src={recentPlaybackProgress.thumbnailUrl}
                                  />
                                </button>
                              ) : (
                                <img
                                  alt=""
                                  className="app-shell__profile-card-playback-thumb"
                                  src={recentPlaybackProgress.thumbnailUrl}
                                />
                              )
                            ) : null}
                            <div className="app-shell__profile-card-playback-copy">
                              <strong>{recentPlaybackProgress.videoTitle ?? recentPlaybackProgress.videoId}</strong>
                              <span>{recentPlaybackProgress.channelTitle ?? '채널 정보 없음'}</span>
                              <span>
                                {formatPlaybackPosition(recentPlaybackProgress.positionSeconds)} ·{' '}
                                {formatProfileDateTime(recentPlaybackProgress.updatedAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="app-shell__profile-card-empty">최근 재생 기록이 아직 없습니다.</p>
                    )}
                  </div>
                </div>
              ) : null}
              <button
                className="app-shell__auth-logout"
                onClick={onLogout}
                title={userIdentityLabel}
                type="button"
              >
                {isLoggingOut ? '...' : '로그아웃'}
              </button>
            </div>
          ) : (
            <div className="app-shell__auth-panel">
              <GoogleLoginButton />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
