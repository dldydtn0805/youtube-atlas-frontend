import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GoogleLoginButton from '../../../components/GoogleLoginButton/GoogleLoginButton';
import ThumbnailPlayOverlay from '../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { AuthStatus, AuthUser } from '../../../features/auth/types';
import type { AchievementTitleCollection, GameNotification } from '../../../features/game/types';
import { formatHeaderPoints, formatPoints } from '../gameHelpers';
import useClickedGameNotifications from '../hooks/useClickedGameNotifications';
import { getVisibleGameNotifications } from '../visibleGameNotifications';
import AchievementTitleBadge from './AchievementTitleBadge';
import AchievementTitleModal from './AchievementTitleModal';
import GameNotificationsPanel from './GameNotificationsPanel';
import ProfileSeasonResultsButton from './ProfileSeasonResultsButton';
import './AppHeader.css';

interface AppHeaderProps {
  authStatus: AuthStatus;
  currentTierCode?: string | null;
  currentTierName?: string | null;
  currentTierScore?: number | null;
  highlightCount?: number;
  isOpenPositionLimitReached?: boolean;
  openPositionCount?: number;
  isDarkMode: boolean;
  isLoggingOut: boolean;
  onLogout: () => void;
  onOpenGameModal?: () => void;
  onOpenGamePositionsModal?: () => void;
  onOpenHighlightsModal?: (notification?: GameNotification) => void;
  onOpenRecentPlayback?: (videoId: string) => void;
  onOpenSeasonResults?: () => void;
  onClearGameNotifications?: () => void;
  onDeleteGameNotification?: (notificationId: string) => void;
  onOpenGameNotificationSellTradeModal?: (notification: GameNotification) => void;
  onRefreshGameNotifications?: () => Promise<void>;
  onRefreshProfile?: () => Promise<void>;
  onOpenTierModal?: () => void;
  onOpenWalletModal?: () => void;
  onToggleThemeMode: () => void;
  themeToggleLabel: string;
  user?: AuthUser | null;
  gameNotifications?: GameNotification[];
  hasUnreadGameNotifications?: boolean;
  isGameNotificationsLoading?: boolean;
  isTitleSaving?: boolean;
  onSelectTitle?: (titleCode: string | null) => Promise<void> | void;
  seasonResultCount?: number;
  walletBalancePoints?: number | null;
  titleCollection?: AchievementTitleCollection;
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

function logGameNotificationsDebug(notifications: GameNotification[]) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(
    '[game-notifications] profile-open',
    notifications.map((notification) => ({
      id: notification.id,
      notificationEventType: notification.notificationEventType ?? null,
      notificationType: notification.notificationType,
      createdAt: notification.createdAt,
      title: notification.title,
      videoTitle: notification.videoTitle,
      message: notification.message,
    })),
  );
}

function isModalEventTarget(target: Node) {
  return target instanceof Element && Boolean(target.closest('.app-shell__modal-backdrop, .app-shell__modal'));
}

function AppHeader({
  authStatus,
  currentTierCode,
  currentTierName,
  currentTierScore,
  highlightCount = 0,
  isOpenPositionLimitReached = false,
  openPositionCount = 0,
  isDarkMode,
  isLoggingOut,
  onLogout,
  onOpenGameModal,
  onOpenGamePositionsModal,
  onOpenHighlightsModal,
  onOpenRecentPlayback,
  onOpenSeasonResults,
  onClearGameNotifications,
  onDeleteGameNotification,
  onOpenGameNotificationSellTradeModal,
  onRefreshGameNotifications,
  onRefreshProfile,
  onOpenTierModal,
  onOpenWalletModal,
  onToggleThemeMode,
  themeToggleLabel,
  user,
  gameNotifications = [],
  hasUnreadGameNotifications = false,
  isGameNotificationsLoading = false,
  isTitleSaving = false,
  onSelectTitle,
  seasonResultCount = 0,
  walletBalancePoints,
  titleCollection,
}: AppHeaderProps) {
  const userIdentityLabel = user?.displayName || user?.email || 'Google 계정';
  const walletSummary =
    typeof walletBalancePoints === 'number' && Number.isFinite(walletBalancePoints)
      ? formatHeaderPoints(walletBalancePoints)
      : '집계 중';
  const tierSummary = currentTierName?.trim() || '미정';
  const tierScoreSummary =
    typeof currentTierScore === 'number' && Number.isFinite(currentTierScore)
      ? formatPoints(currentTierScore)
      : '집계 중';
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const [isAchievementTitleModalOpen, setIsAchievementTitleModalOpen] = useState(false);
  const [isProfileRefreshing, setIsProfileRefreshing] = useState(false);
  const profileCardRef = useRef<HTMLDivElement | null>(null);
  const profileRefreshRequestIdRef = useRef(0);
  const { clickedNotificationIds, markGameNotificationClicked } = useClickedGameNotifications(user?.id);
  const visibleGameNotifications = useMemo(
    () => getVisibleGameNotifications(gameNotifications, clickedNotificationIds),
    [clickedNotificationIds, gameNotifications],
  );
  const hasVisibleUnreadGameNotifications = visibleGameNotifications.some(
    (notification) => !notification.readAt,
  );
  const profileButtonLabel = `${userIdentityLabel} 프로필 정보 열기`;
  const playbackProgress = user?.lastPlaybackProgress ?? null;
  const recentPlaybackProgresses =
    user?.recentPlaybackProgresses && user.recentPlaybackProgresses.length > 0
      ? user.recentPlaybackProgresses
      : playbackProgress
        ? [playbackProgress]
        : [];
  const closeProfileCard = () => {
    setIsProfileCardOpen(false);
  };

  const openAchievementTitleModal = () => {
    setIsProfileCardOpen(false);
    setIsAchievementTitleModalOpen(true);
  };

  const handleSelectTitle = async (titleCode: string | null) => {
    if (!onSelectTitle) {
      return;
    }

    setIsAchievementTitleModalOpen(false);
    setIsProfileCardOpen(true);
    await onSelectTitle(titleCode);
  };

  const handleProfileButtonClick = () => {
    if (isProfileCardOpen) {
      setIsProfileCardOpen(false);
      return;
    }

    logGameNotificationsDebug(gameNotifications);
    setIsProfileCardOpen(true);

    const refreshTasks = [
      onRefreshProfile?.(),
      onRefreshGameNotifications?.(),
    ].filter((task): task is Promise<void> => Boolean(task));

    if (refreshTasks.length === 0) {
      return;
    }

    const requestId = profileRefreshRequestIdRef.current + 1;
    profileRefreshRequestIdRef.current = requestId;
    setIsProfileRefreshing(true);

    void Promise.all(refreshTasks)
      .catch(() => {
        // Keep the profile card usable even if the background refresh fails.
      })
      .finally(() => {
        if (profileRefreshRequestIdRef.current === requestId) {
          setIsProfileRefreshing(false);
        }
      });
  };

  useEffect(() => {
    if (!isProfileCardOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (isModalEventTarget(event.target)) {
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
        <Link
          className="app-shell__title-link"
          to="/"
          aria-label="The Rank Game 메인 페이지로 이동"
        >
          <span className="app-shell__title-logo-art" aria-hidden="true">
            <svg className="app-shell__title-logo-art-icon" shapeRendering="crispEdges" viewBox="0 30 740 160">
              <defs>
                <linearGradient id="app-header-title-ink-tile" x1="0" x2="0" y1="0" y2="1">
                  <stop className="app-shell__title-logo-ink-top" offset="0" />
                  <stop className="app-shell__title-logo-ink-bottom" offset="1" />
                </linearGradient>
                <linearGradient id="app-header-title-metal-tile" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#d9d9d9" offset="0" />
                  <stop stopColor="#8c8c8c" offset="1" />
                </linearGradient>
                <pattern id="app-header-title-ink-pixels" height="10" patternUnits="userSpaceOnUse" width="10">
                  <rect fill="url(#app-header-title-ink-tile)" height="10" width="10" />
                  <path className="app-shell__title-logo-pixel-grid" d="M9.5 0v10M0 9.5h10" />
                </pattern>
                <pattern id="app-header-title-metal-pixels" height="10" patternUnits="userSpaceOnUse" width="10">
                  <rect fill="url(#app-header-title-metal-tile)" height="10" width="10" />
                  <path className="app-shell__title-logo-pixel-grid" d="M9.5 0v10M0 9.5h10" />
                </pattern>
              </defs>
              <path
                d="M450 30h40v10h-40ZM250 40h240v10h-240ZM50 50h100v10H50ZM250 50h240v10h-240ZM50 60h100v10H50ZM250 60h240v10h-240ZM0 70h70v10H0ZM290 70h30v10h-30ZM420 70h70v10h-70ZM0 80h70v10H0ZM290 80h30v10h-30ZM420 80h30v10h-30ZM0 90h70v10H0ZM290 90h30v10h-30ZM420 90h30v10h-30ZM0 100h480v10H0ZM700 100h40v10h-40ZM0 110h480v10H0ZM700 110h40v10h-40ZM0 120h480v10H0ZM700 120h40v10h-40ZM0 130h480v10H0ZM700 130h40v10h-40ZM0 140h70v10H0ZM160 140h50v10h-50ZM0 150h70v10H0ZM160 150h100v10H160ZM0 160h70v10H0ZM170 160h30v10h-30ZM210 160h10v10h-10ZM250 160h10v10h-10ZM0 170h70v10H0ZM170 170h30v10h-30ZM210 170h10v10h-10ZM250 170h10v10h-10ZM180 180h20v10h-20ZM210 180h50v10h-50Z"
                fill="url(#app-header-title-ink-pixels)"
              />
              <path
                d="M480 110h220v10H480ZM480 120h220v10H480Z"
                fill="url(#app-header-title-metal-pixels)"
              />
            </svg>
          </span>
          <h1 className="app-shell__title" aria-label="The Rank Game">
            <span className="app-shell__title-main" aria-hidden="true">
              <span className="app-shell__title-the">he</span>
              <span className="app-shell__title-rank">Rank</span>
              <span className="app-shell__title-game">Game</span>
            </span>
          </h1>
        </Link>
        <div className="app-shell__header-actions">
          {authStatus === 'authenticated' && user ? (
            <div className="app-shell__auth-summary" aria-label="내 지갑 및 티어">
              <button
                aria-label="내 게임 열기"
                className="app-shell__auth-summary-item app-shell__auth-summary-item--button app-shell__auth-summary-item--game"
                data-tier-code={currentTierCode ?? undefined}
                data-limit-reached={isOpenPositionLimitReached ? 'true' : undefined}
                onClick={onOpenGameModal}
                type="button"
              >
                <span className="app-shell__auth-summary-label">내 게임</span>
                <strong className="app-shell__auth-summary-value">{openPositionCount}개</strong>
              </button>
              <button
                aria-label="지갑 현황 열기"
                className="app-shell__auth-summary-item app-shell__auth-summary-item--button app-shell__auth-summary-item--wallet"
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
                {hasUnreadGameNotifications && hasVisibleUnreadGameNotifications ? (
                  <span className="app-shell__auth-avatar-notification-dot" aria-hidden="true" />
                ) : null}
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
                  {isProfileRefreshing ? (
                    <div className="app-shell__profile-card-sync" role="status">
                      <span className="app-shell__profile-card-sync-spinner" aria-hidden="true" />
                      <span>최신 정보 불러오는 중</span>
                    </div>
                  ) : null}
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
                      <div className="app-shell__profile-card-title-row">
                        {user.selectedTitle ? (
                          <button
                            className="app-shell__profile-card-title"
                            onClick={openAchievementTitleModal}
                            type="button"
                          >
                            <AchievementTitleBadge title={user.selectedTitle} />
                          </button>
                        ) : (
                          <button
                            className="app-shell__profile-card-title app-shell__profile-card-title--empty"
                          onClick={openAchievementTitleModal}
                          type="button"
                        >
                            <span className="app-shell__profile-card-title-empty">
                              칭호 설정하기
                            </span>
                          </button>
                        )}
                      </div>
                      <span>{`Atlas에 함께한지 ${formatAtlasDays(user.createdAt)}`}</span>
                    </div>
                  </div>
                  <div className="app-shell__profile-card-grid">
                    <button
                      className="app-shell__profile-card-grid-button"
                      onClick={() => {
                        closeProfileCard();
                        onOpenGamePositionsModal?.();
                      }}
                      type="button"
                    >
                      <span>내 게임</span>
                      <strong>{openPositionCount}개</strong>
                    </button>
                    <button
                      className="app-shell__profile-card-grid-button"
                      onClick={() => {
                        closeProfileCard();
                        onOpenHighlightsModal?.();
                      }}
                      type="button"
                    >
                      <span>하이라이트</span>
                      <strong>{highlightCount}개</strong>
                    </button>
                    <button
                      className="app-shell__profile-card-grid-button"
                      onClick={() => {
                        closeProfileCard();
                        onOpenTierModal?.();
                      }}
                      type="button"
                    >
                      <span>티어 총자산</span>
                      <strong>{tierScoreSummary}</strong>
                    </button>
                    {onOpenSeasonResults ? (
                      <ProfileSeasonResultsButton
                        onOpen={() => {
                          closeProfileCard();
                          onOpenSeasonResults();
                        }}
                        resultCount={seasonResultCount}
                      />
                    ) : null}
                  </div>
                  <div className="app-shell__profile-card-section">
                    <GameNotificationsPanel
                      clickedNotificationIds={clickedNotificationIds}
                      isLoading={isGameNotificationsLoading}
                      notifications={visibleGameNotifications}
                      onClear={onClearGameNotifications}
                      onDelete={onDeleteGameNotification}
                      onMarkClicked={markGameNotificationClicked}
                      onOpenHighlights={
                        onOpenHighlightsModal
                          ? (notification) => {
                              onOpenHighlightsModal(notification);
                            }
                          : undefined
                      }
                      onOpenSell={
                        onOpenGameNotificationSellTradeModal
                          ? (notification) => {
                              onOpenGameNotificationSellTradeModal(notification);
                            }
                          : undefined
                      }
                      onOpenTier={
                        onOpenTierModal
                          ? () => {
                              closeProfileCard();
                              onOpenTierModal();
                            }
                          : undefined
                      }
                    />
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
                                  className="app-shell__profile-card-playback-thumb-button thumbnail-play-overlay-host"
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
                                  <ThumbnailPlayOverlay />
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
              <AchievementTitleModal
                collection={titleCollection}
                isOpen={isAchievementTitleModalOpen}
                isSaving={isTitleSaving}
                onClose={() => setIsAchievementTitleModalOpen(false)}
                onSelectTitle={(titleCode) => void handleSelectTitle(titleCode)}
              />
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
