import { useEffect, useState } from 'react';
import GoogleLoginButton from '../../components/GoogleLoginButton/GoogleLoginButton';
import { useAuth } from '../../features/auth/useAuth';
import {
  useAdminDashboard,
  useAdminUserDetail,
  useAdminUsers,
  useDeleteAdminUser,
  useUpdateAdminUserWallet,
} from '../../features/admin/queries';
import type {
  AdminCommentSummary,
  AdminFavoriteSummary,
  AdminTrendSnapshot,
  AdminUserDetail,
  AdminUserSummary,
} from '../../features/admin/types';
import useLogoutOnUnauthorized from '../home/hooks/useLogoutOnUnauthorized';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import './AdminPage.css';

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-';
  }

  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatDurationSeconds(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return '-';
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  return [hours, minutes, seconds]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
    .join(':');
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="admin-page__metric-card">
      <p className="admin-page__metric-label">{label}</p>
      <strong className="admin-page__metric-value">{formatNumber(value)}</strong>
    </article>
  );
}

function UserBadge({ admin }: { admin: boolean }) {
  return admin ? <span className="admin-page__pill">ADMIN</span> : null;
}

function RecentUsersTable({ items }: { items: AdminUserSummary[] }) {
  return (
    <div className="admin-page__table-wrap">
      <table className="admin-page__table">
        <thead>
          <tr>
            <th>사용자</th>
            <th>이메일</th>
            <th>가입일</th>
            <th>마지막 로그인</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="admin-page__user-cell">
                  <span>{item.displayName}</span>
                  <UserBadge admin={item.admin} />
                </div>
              </td>
              <td>{item.email}</td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>{formatDateTime(item.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentCommentsTable({ items }: { items: AdminCommentSummary[] }) {
  return (
    <div className="admin-page__table-wrap">
      <table className="admin-page__table">
        <thead>
          <tr>
            <th>작성자</th>
            <th>댓글</th>
            <th>비디오</th>
            <th>작성일</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.author}</td>
              <td className="admin-page__content-cell">{item.content}</td>
              <td>{item.videoId}</td>
              <td>{formatDateTime(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentFavoritesTable({ items }: { items: AdminFavoriteSummary[] }) {
  return (
    <div className="admin-page__table-wrap">
      <table className="admin-page__table">
        <thead>
          <tr>
            <th>채널</th>
            <th>사용자</th>
            <th>채널 ID</th>
            <th>추가일</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.channelTitle}</td>
              <td>{item.userEmail}</td>
              <td>{item.channelId}</td>
              <td>{formatDateTime(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendList({ items }: { items: AdminTrendSnapshot[] }) {
  return (
    <div className="admin-page__trend-list">
      {items.map((item) => (
        <article className="admin-page__trend-card" key={item.videoId}>
          <img alt="" className="admin-page__trend-thumbnail" src={item.thumbnailUrl} />
          <div className="admin-page__trend-body">
            <p className="admin-page__trend-rank">#{item.rank}</p>
            <strong className="admin-page__trend-title">{item.title}</strong>
            <p className="admin-page__trend-channel">{item.channelTitle}</p>
            <p className="admin-page__trend-meta">조회수 {formatNumber(item.viewCount)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function UserDirectoryTable({
  items,
  selectedUserId,
  onSelect,
}: {
  items: AdminUserSummary[];
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
}) {
  return (
    <div className="admin-page__table-wrap">
      <table className="admin-page__table admin-page__table--interactive">
        <thead>
          <tr>
            <th>사용자</th>
            <th>이메일</th>
            <th>권한</th>
            <th>최근 로그인</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={item.id === selectedUserId ? 'admin-page__table-row--selected' : undefined}
              key={item.id}
              onClick={() => onSelect(item.id)}
            >
              <td>{item.displayName}</td>
              <td>{item.email}</td>
              <td>{item.admin ? '관리자' : '일반'}</td>
              <td>{formatDateTime(item.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailPanel({
  user,
  walletDraft,
  onWalletDraftChange,
  onSaveWallet,
  onDeleteUser,
  isSaving,
  isDeleting,
}: {
  user: AdminUserDetail;
  walletDraft: {
    balancePoints: string;
    reservedPoints: string;
    realizedPnlPoints: string;
  };
  onWalletDraftChange: (field: 'balancePoints' | 'reservedPoints' | 'realizedPnlPoints', value: string) => void;
  onSaveWallet: () => void;
  onDeleteUser: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="admin-page__detail-stack">
      <div className="admin-page__detail-card">
        <div className="admin-page__section-header">
          <h3 className="admin-page__section-title">사용자 상세</h3>
          <UserBadge admin={user.admin} />
        </div>
        <div className="admin-page__detail-list">
          <p><span>이름</span><strong>{user.displayName}</strong></p>
          <p><span>이메일</span><strong>{user.email}</strong></p>
          <p><span>가입일</span><strong>{formatDateTime(user.createdAt)}</strong></p>
          <p><span>마지막 로그인</span><strong>{formatDateTime(user.lastLoginAt)}</strong></p>
          <p><span>즐겨찾기 수</span><strong>{formatNumber(user.favoriteCount)}</strong></p>
        </div>
      </div>

      <div className="admin-page__detail-card">
        <div className="admin-page__section-header">
          <h3 className="admin-page__section-title">최근 재생 위치</h3>
        </div>
        {user.lastPlaybackProgress ? (
          <div className="admin-page__detail-list">
            <p><span>영상</span><strong>{user.lastPlaybackProgress.videoTitle ?? user.lastPlaybackProgress.videoId}</strong></p>
            <p><span>채널</span><strong>{user.lastPlaybackProgress.channelTitle ?? '-'}</strong></p>
            <p><span>재생 위치</span><strong>{formatDurationSeconds(user.lastPlaybackProgress.positionSeconds)}</strong></p>
            <p><span>업데이트</span><strong>{formatDateTime(user.lastPlaybackProgress.updatedAt)}</strong></p>
          </div>
        ) : (
          <p className="admin-page__muted">저장된 최근 재생 위치가 없습니다.</p>
        )}
      </div>

      <div className="admin-page__detail-card">
        <div className="admin-page__section-header">
          <h3 className="admin-page__section-title">활성 시즌 지갑 수정</h3>
          <span className="admin-page__section-caption">
            {user.activeSeasonGame ? user.activeSeasonGame.seasonName : '활성 시즌 없음'}
          </span>
        </div>
        {user.activeSeasonGame ? (
          <>
            <div className="admin-page__detail-list admin-page__detail-list--compact">
              <p><span>참여 여부</span><strong>{user.activeSeasonGame.participating ? '참여 중' : '미참여'}</strong></p>
              <p><span>오픈 포지션</span><strong>{formatNumber(user.activeSeasonGame.openPositionCount)}</strong></p>
              <p><span>종료 포지션</span><strong>{formatNumber(user.activeSeasonGame.closedPositionCount)}</strong></p>
              <p><span>총 자산</span><strong>{formatNumber(user.activeSeasonGame.totalAssetPoints)}</strong></p>
            </div>
            <div className="admin-page__form-grid">
              <label className="admin-page__field">
                <span>가용 포인트</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => onWalletDraftChange('balancePoints', event.target.value)}
                  type="text"
                  value={walletDraft.balancePoints}
                />
              </label>
              <label className="admin-page__field">
                <span>예약 포인트</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => onWalletDraftChange('reservedPoints', event.target.value)}
                  type="text"
                  value={walletDraft.reservedPoints}
                />
              </label>
              <label className="admin-page__field">
                <span>실현 손익</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => onWalletDraftChange('realizedPnlPoints', event.target.value)}
                  type="text"
                  value={walletDraft.realizedPnlPoints}
                />
              </label>
            </div>
            <p className="admin-page__muted">
              예약 포인트는 오픈 포지션과 연결되어 있을 수 있으니, 수동 조정 시 운영 기준으로만 사용하세요.
            </p>
            <div className="admin-page__action-row">
              <button className="admin-page__button" disabled={isSaving || isDeleting} onClick={onSaveWallet} type="button">
                {isSaving ? '저장 중...' : '지갑 저장'}
              </button>
              <button
                className="admin-page__button admin-page__button--danger"
                disabled={isSaving || isDeleting}
                onClick={onDeleteUser}
                type="button"
              >
                {isDeleting ? '탈퇴 처리 중...' : '유저 탈퇴'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="admin-page__muted">현재 활성 시즌이 없어 지갑 수정은 비활성화되어 있습니다.</p>
            <div className="admin-page__action-row">
              <button
                className="admin-page__button admin-page__button--danger"
                disabled={isDeleting}
                onClick={onDeleteUser}
                type="button"
              >
                {isDeleting ? '탈퇴 처리 중...' : '유저 탈퇴'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function parsePointInput(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} 값을 입력해주세요.`);
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label}는 0 이상의 정수만 입력할 수 있습니다.`);
  }

  return Number.parseInt(normalized, 10);
}

export default function AdminPage() {
  const { accessToken, isLoggingOut, logout, status, user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [walletDraft, setWalletDraft] = useState({
    balancePoints: '',
    reservedPoints: '',
    realizedPnlPoints: '',
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const dashboardQuery = useAdminDashboard(accessToken, status === 'authenticated');
  const usersQuery = useAdminUsers(accessToken, submittedQuery, status === 'authenticated');
  const detailQuery = useAdminUserDetail(accessToken, selectedUserId, status === 'authenticated');
  const updateWalletMutation = useUpdateAdminUserWallet(accessToken);
  const deleteUserMutation = useDeleteAdminUser(accessToken);

  useLogoutOnUnauthorized(dashboardQuery.error, logout);
  useLogoutOnUnauthorized(usersQuery.error, logout);
  useLogoutOnUnauthorized(detailQuery.error, logout);

  useEffect(() => {
    const users = usersQuery.data?.users ?? [];

    if (users.length === 0) {
      setSelectedUserId(null);
      return;
    }

    if (selectedUserId === null || !users.some((item) => item.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, usersQuery.data]);

  useEffect(() => {
    const game = detailQuery.data?.activeSeasonGame;

    if (!game) {
      setWalletDraft({
        balancePoints: '',
        reservedPoints: '',
        realizedPnlPoints: '',
      });
      return;
    }

    setWalletDraft({
      balancePoints: String(game.balancePoints ?? 0),
      reservedPoints: String(game.reservedPoints ?? 0),
      realizedPnlPoints: String(game.realizedPnlPoints ?? 0),
    });
  }, [detailQuery.data]);

  const errorMessage =
    dashboardQuery.error instanceof ApiRequestError
      ? dashboardQuery.error.message
      : usersQuery.error instanceof ApiRequestError
        ? usersQuery.error.message
        : detailQuery.error instanceof ApiRequestError
          ? detailQuery.error.message
          : '관리자 정보를 불러오지 못했습니다.';
  const isForbidden =
    dashboardQuery.error instanceof ApiRequestError && dashboardQuery.error.status === 403;

  const handleWalletDraftChange = (field: 'balancePoints' | 'reservedPoints' | 'realizedPnlPoints', value: string) => {
    setWalletDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleWalletSave = () => {
    if (!selectedUserId) {
      return;
    }

    try {
      const request = {
        balancePoints: parsePointInput(walletDraft.balancePoints, '가용 포인트'),
        reservedPoints: parsePointInput(walletDraft.reservedPoints, '예약 포인트'),
        realizedPnlPoints: parsePointInput(walletDraft.realizedPnlPoints, '실현 손익'),
      };

      setActionMessage(null);
      updateWalletMutation.mutate(
        { userId: selectedUserId, request },
        {
          onSuccess: () => {
            setActionMessage('지갑 정보가 저장되었습니다.');
          },
          onError: (error) => {
            setActionMessage(error instanceof Error ? error.message : '지갑 저장에 실패했습니다.');
          },
        },
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '입력값을 확인해주세요.');
    }
  };

  const handleDeleteUser = () => {
    if (!selectedUserId || !detailQuery.data) {
      return;
    }

    const confirmed = window.confirm(
      `${detailQuery.data.displayName} (${detailQuery.data.email}) 사용자를 탈퇴 처리할까요? 연관 세션, 즐겨찾기, 재생 위치, 게임 데이터가 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setActionMessage(null);
    deleteUserMutation.mutate(selectedUserId, {
      onSuccess: () => {
        setActionMessage('유저 탈퇴 처리가 완료되었습니다.');
        setSelectedUserId(null);
      },
      onError: (error) => {
        setActionMessage(error instanceof Error ? error.message : '유저 탈퇴 처리에 실패했습니다.');
      },
    });
  };

  if (!isApiConfigured) {
    return (
      <main className="admin-page">
        <section className="admin-page__hero admin-page__hero--centered">
          <p className="admin-page__eyebrow">Admin</p>
          <h1 className="admin-page__title">백엔드 연결이 필요합니다</h1>
          <p className="admin-page__description">`VITE_API_BASE_URL` 설정 후 관리자 대시보드를 사용할 수 있습니다.</p>
        </section>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="admin-page">
        <section className="admin-page__hero admin-page__hero--centered">
          <p className="admin-page__eyebrow">Admin</p>
          <h1 className="admin-page__title">세션을 확인하는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (status !== 'authenticated') {
    return (
      <main className="admin-page">
        <section className="admin-page__hero admin-page__hero--centered">
          <p className="admin-page__eyebrow">Admin</p>
          <h1 className="admin-page__title">관리자 로그인이 필요합니다</h1>
          <p className="admin-page__description">
            기존 구글 로그인 세션을 그대로 사용합니다. 로그인 후 허용된 관리자 이메일이면 대시보드가 열립니다.
          </p>
          <div className="admin-page__login-panel">
            <GoogleLoginButton />
          </div>
          <a className="admin-page__link" href="/">
            홈으로 이동
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-page__hero">
        <div>
          <p className="admin-page__eyebrow">Operations Console</p>
          <h1 className="admin-page__title">YouTube Atlas Admin</h1>
          <p className="admin-page__description">
            최근 사용자 활동과 댓글, 즐겨찾기, 트렌딩 수집 상태뿐 아니라 유저 지갑 수정과 탈퇴 처리까지 한 화면에서 운영할 수 있습니다.
          </p>
        </div>
        <div className="admin-page__hero-actions">
          <div className="admin-page__user-chip">
            <span className="admin-page__user-label">Signed in as</span>
            <strong>{user?.email}</strong>
          </div>
          <a className="admin-page__button admin-page__button--ghost" href="/">
            홈으로
          </a>
          <button
            className="admin-page__button"
            disabled={isLoggingOut}
            onClick={() => {
              void logout();
            }}
            type="button"
          >
            로그아웃
          </button>
        </div>
      </section>

      {dashboardQuery.isLoading || usersQuery.isLoading ? (
        <section className="admin-page__panel">
          <h2 className="admin-page__section-title">대시보드 로딩 중</h2>
        </section>
      ) : null}

      {dashboardQuery.isError || usersQuery.isError || detailQuery.isError ? (
        <section className="admin-page__panel">
          <h2 className="admin-page__section-title">{isForbidden ? '접근 권한 없음' : '불러오기 실패'}</h2>
          <p className="admin-page__error">{errorMessage}</p>
          {isForbidden ? (
            <p className="admin-page__muted">백엔드의 `ADMIN_ALLOWED_EMAILS`에 현재 이메일을 추가하면 접근할 수 있습니다.</p>
          ) : null}
        </section>
      ) : null}

      {actionMessage ? (
        <section className="admin-page__panel admin-page__panel--notice">
          <p>{actionMessage}</p>
        </section>
      ) : null}

      {dashboardQuery.data ? (
        <>
          <section className="admin-page__metrics">
            <MetricCard label="총 사용자" value={dashboardQuery.data.metrics.totalUsers} />
            <MetricCard label="총 댓글" value={dashboardQuery.data.metrics.totalComments} />
            <MetricCard label="총 즐겨찾기" value={dashboardQuery.data.metrics.totalFavorites} />
            <MetricCard label="트렌드 수집 런" value={dashboardQuery.data.metrics.totalTrendRuns} />
          </section>

          <section className="admin-page__grid">
            <article className="admin-page__panel">
              <h2 className="admin-page__section-title">활성 시즌</h2>
              {dashboardQuery.data.activeSeason ? (
                <div className="admin-page__detail-list">
                  <p><span>이름</span><strong>{dashboardQuery.data.activeSeason.name}</strong></p>
                  <p><span>상태</span><strong>{dashboardQuery.data.activeSeason.status}</strong></p>
                  <p><span>지역</span><strong>{dashboardQuery.data.activeSeason.regionCode}</strong></p>
                  <p><span>시작</span><strong>{formatDateTime(dashboardQuery.data.activeSeason.startAt)}</strong></p>
                  <p><span>종료</span><strong>{formatDateTime(dashboardQuery.data.activeSeason.endAt)}</strong></p>
                </div>
              ) : (
                <p className="admin-page__muted">현재 활성 시즌이 없습니다.</p>
              )}
            </article>

            <article className="admin-page__panel">
              <h2 className="admin-page__section-title">최신 트렌딩 런</h2>
              {dashboardQuery.data.latestTrendRun ? (
                <>
                  <div className="admin-page__detail-list">
                    <p><span>카테고리</span><strong>{dashboardQuery.data.latestTrendRun.categoryLabel}</strong></p>
                    <p><span>지역</span><strong>{dashboardQuery.data.latestTrendRun.regionCode}</strong></p>
                    <p><span>소스</span><strong>{dashboardQuery.data.latestTrendRun.source}</strong></p>
                    <p><span>수집 시각</span><strong>{formatDateTime(dashboardQuery.data.latestTrendRun.capturedAt)}</strong></p>
                  </div>
                  <TrendList items={dashboardQuery.data.latestTrendRun.topVideos} />
                </>
              ) : (
                <p className="admin-page__muted">아직 수집된 트렌딩 데이터가 없습니다.</p>
              )}
            </article>
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
              <div>
                <h2 className="admin-page__section-title">유저 관리</h2>
                <p className="admin-page__section-caption">검색, 지갑 수정, 탈퇴 처리를 지원합니다.</p>
              </div>
              <form
                className="admin-page__search-bar"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmittedQuery(searchInput.trim() || null);
                }}
              >
                <input
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="이메일 또는 닉네임 검색"
                  type="search"
                  value={searchInput}
                />
                <button className="admin-page__button admin-page__button--ghost" type="submit">
                  검색
                </button>
              </form>
            </div>
            <div className="admin-page__management-grid">
              <article className="admin-page__subpanel">
                <div className="admin-page__section-header">
                  <h3 className="admin-page__section-title">유저 목록</h3>
                  <span className="admin-page__section-caption">{formatNumber(usersQuery.data?.count ?? 0)}명</span>
                </div>
                {usersQuery.data?.users.length ? (
                  <UserDirectoryTable
                    items={usersQuery.data.users}
                    onSelect={setSelectedUserId}
                    selectedUserId={selectedUserId}
                  />
                ) : (
                  <p className="admin-page__muted">검색 결과가 없습니다.</p>
                )}
              </article>
              <article className="admin-page__subpanel">
                {detailQuery.isLoading ? <p className="admin-page__muted">사용자 상세를 불러오는 중입니다.</p> : null}
                {detailQuery.data ? (
                  <UserDetailPanel
                    isDeleting={deleteUserMutation.isPending}
                    isSaving={updateWalletMutation.isPending}
                    onDeleteUser={handleDeleteUser}
                    onSaveWallet={handleWalletSave}
                    onWalletDraftChange={handleWalletDraftChange}
                    user={detailQuery.data}
                    walletDraft={walletDraft}
                  />
                ) : !detailQuery.isLoading ? (
                  <p className="admin-page__muted">왼쪽 목록에서 유저를 선택하면 상세 정보가 표시됩니다.</p>
                ) : null}
              </article>
            </div>
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header">
              <h2 className="admin-page__section-title">최근 가입 사용자</h2>
              <span className="admin-page__section-caption">최근 8명</span>
            </div>
            <RecentUsersTable items={dashboardQuery.data.recentUsers} />
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header">
              <h2 className="admin-page__section-title">최근 댓글</h2>
              <span className="admin-page__section-caption">최근 8건</span>
            </div>
            <RecentCommentsTable items={dashboardQuery.data.recentComments} />
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header">
              <h2 className="admin-page__section-title">최근 즐겨찾기 추가</h2>
              <span className="admin-page__section-caption">최근 8건</span>
            </div>
            <RecentFavoritesTable items={dashboardQuery.data.recentFavorites} />
          </section>
        </>
      ) : null}
    </main>
  );
}
