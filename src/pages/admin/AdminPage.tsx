import { useEffect, useState } from 'react';
import GoogleLoginButton from '../../components/GoogleLoginButton/GoogleLoginButton';
import { useAuth } from '../../features/auth/useAuth';
import {
  useCloseAdminSeason,
  useAdminDashboard,
  useAdminTrendSnapshots,
  useAdminUserDetail,
  useAdminUserPositions,
  useAdminUsers,
  useDeleteAdminUser,
  usePurgeAdminComments,
  usePurgeAdminTradeHistory,
  useUpdateAdminUserPosition,
  useUpdateAdminSeasonSchedule,
  useUpdateAdminUserWallet,
} from '../../features/admin/queries';
import type {
  AdminCommentSummary,
  AdminFavoriteSummary,
  AdminSeasonSummary,
  AdminTrendSnapshotHistoryItem,
  AdminTrendSnapshot,
  AdminCoinTierSummary,
  AdminUserDetail,
  AdminUserGameSummary,
  AdminUserPosition,
  AdminUserSummary,
} from '../../features/admin/types';
import useLogoutOnUnauthorized from '../home/hooks/useLogoutOnUnauthorized';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import countryCodes from '../../constants/countryCodes';
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

function getRemainingCoinsToNextTier(coinBalance: number | null | undefined, nextTier: AdminCoinTierSummary | null | undefined) {
  if (typeof coinBalance !== 'number' || !nextTier) {
    return null;
  }

  return Math.max(nextTier.minCoinBalance - coinBalance, 0);
}

function getActiveSeasonGames(user: AdminUserDetail | null | undefined) {
  if (!user) {
    return [] as AdminUserGameSummary[];
  }

  if (Array.isArray(user.activeSeasonGames) && user.activeSeasonGames.length > 0) {
    return user.activeSeasonGames;
  }

  return user.activeSeasonGame ? [user.activeSeasonGame] : [];
}

function getDashboardActiveSeasons(dashboard: { activeSeason?: AdminSeasonSummary | null; activeSeasons?: AdminSeasonSummary[] } | null | undefined) {
  if (!dashboard) {
    return [] as AdminSeasonSummary[];
  }

  if (Array.isArray(dashboard.activeSeasons) && dashboard.activeSeasons.length > 0) {
    return dashboard.activeSeasons;
  }

  return dashboard.activeSeason ? [dashboard.activeSeason] : [];
}

function formatDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function createDefaultSnapshotRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  return {
    startAt: formatDateTimeInput(start.toISOString()),
    endAt: formatDateTimeInput(end.toISOString()),
  };
}

function formatRegionLabel(regionCode: string | null | undefined) {
  if (!regionCode) {
    return '전체 국가';
  }

  const country = countryCodes.find((item) => item.code === regionCode);
  return country ? `${country.name} (${country.code})` : regionCode;
}

function parseDateTimeInput(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} 시각을 입력해주세요.`);
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${label} 시각 형식이 올바르지 않습니다.`);
  }

  return parsedDate.toISOString();
}

function formatCommentCleanupMessage(deletedCount: number, deleteBefore: string) {
  return `${formatNumber(deletedCount)}건의 댓글을 정리했습니다. 기준 시각: ${formatDateTime(deleteBefore)}`;
}

function formatTradeHistoryCleanupMessage(
  deletedPositionCount: number,
  deletedLedgerCount: number,
  deletedCoinPayoutCount: number,
  deletedDividendPayoutCount: number,
  deleteBefore: string,
) {
  return [
    `${formatNumber(deletedPositionCount)}건의 거래내역을 정리했습니다.`,
    `원장 ${formatNumber(deletedLedgerCount)}건`,
    `코인 지급 ${formatNumber(deletedCoinPayoutCount)}건`,
    `배당 지급 ${formatNumber(deletedDividendPayoutCount)}건`,
    `기준 시각: ${formatDateTime(deleteBefore)}`,
  ].join(' ');
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

function TrendSnapshotHistoryTable({ items }: { items: AdminTrendSnapshotHistoryItem[] }) {
  return (
    <div className="admin-page__table-wrap">
      <table className="admin-page__table">
        <thead>
          <tr>
            <th>저장 시각</th>
            <th>수집 시각</th>
            <th>런</th>
            <th>지역/카테고리</th>
            <th>랭크</th>
            <th>영상</th>
            <th>채널</th>
            <th>조회수</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.savedAt)}</td>
              <td>{formatDateTime(item.capturedAt)}</td>
              <td>
                <div className="admin-page__detail-list admin-page__detail-list--table">
                  <p><span>#{item.runId}</span><strong>{item.source}</strong></p>
                </div>
              </td>
              <td>{item.regionCode} / {item.categoryLabel || item.categoryId}</td>
              <td>#{item.rank}</td>
              <td className="admin-page__content-cell">
                <strong>{item.title}</strong>
                <br />
                <span className="admin-page__muted">{item.videoId}</span>
              </td>
              <td>{item.channelTitle}</td>
              <td>{formatNumber(item.viewCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  positions,
  selectedPositionId,
  onSelectPosition,
  positionDraft,
  onPositionDraftChange,
  onSavePosition,
  isSavingPosition,
  selectedSeasonId,
  onSelectSeason,
  walletDraft,
  onWalletDraftChange,
  onSaveWallet,
  onDeleteUser,
  isSaving,
  isDeleting,
}: {
  user: AdminUserDetail;
  positions: AdminUserPosition[];
  selectedPositionId: number | null;
  onSelectPosition: (positionId: number) => void;
  positionDraft: {
    quantity: string;
    stakePoints: string;
  };
  onPositionDraftChange: (field: 'quantity' | 'stakePoints', value: string) => void;
  onSavePosition: () => void;
  isSavingPosition: boolean;
  selectedSeasonId: number | null;
  onSelectSeason: (seasonId: number) => void;
  walletDraft: {
    balancePoints: string;
    reservedPoints: string;
    realizedPnlPoints: string;
    coinBalance: string;
  };
  onWalletDraftChange: (
    field: 'balancePoints' | 'reservedPoints' | 'realizedPnlPoints' | 'coinBalance',
    value: string,
  ) => void;
  onSaveWallet: () => void;
  onDeleteUser: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const activeSeasonGames = getActiveSeasonGames(user);
  const selectedSeasonGame =
    activeSeasonGames.find((item) => item.seasonId === selectedSeasonId) ??
    activeSeasonGames[0] ??
    null;
  const selectedPosition = positions.find((item) => item.id === selectedPositionId) ?? positions[0] ?? null;
  const remainingCoinsToNextTier = getRemainingCoinsToNextTier(
    selectedSeasonGame?.coinBalance,
    selectedSeasonGame?.nextCoinTier,
  );

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
            {selectedSeasonGame ? `${selectedSeasonGame.regionCode} · ${selectedSeasonGame.seasonName}` : '활성 시즌 없음'}
          </span>
        </div>
        {activeSeasonGames.length > 1 ? (
          <div className="admin-page__season-selector" role="tablist" aria-label="활성 시즌 지갑 선택">
            {activeSeasonGames.map((seasonGame) => (
              <button
                aria-selected={seasonGame.seasonId === selectedSeasonId}
                className="admin-page__season-tab"
                data-active={seasonGame.seasonId === selectedSeasonId}
                key={seasonGame.seasonId}
                onClick={() => onSelectSeason(seasonGame.seasonId)}
                role="tab"
                type="button"
              >
                <strong>{seasonGame.regionCode}</strong>
                <span>{seasonGame.seasonName}</span>
              </button>
            ))}
          </div>
        ) : null}
        {selectedSeasonGame ? (
          <>
            <div className="admin-page__detail-list admin-page__detail-list--compact">
              <p><span>지역</span><strong>{selectedSeasonGame.regionCode}</strong></p>
              <p><span>참여 여부</span><strong>{selectedSeasonGame.participating ? '참여 중' : '미참여'}</strong></p>
              <p><span>오픈 포지션</span><strong>{formatNumber(selectedSeasonGame.openPositionCount)}</strong></p>
              <p><span>종료 포지션</span><strong>{formatNumber(selectedSeasonGame.closedPositionCount)}</strong></p>
              <p><span>코인 보유량</span><strong>{formatNumber(selectedSeasonGame.coinBalance)}</strong></p>
              <p><span>현재 티어</span><strong>{selectedSeasonGame.currentCoinTier?.displayName ?? '-'}</strong></p>
              <p><span>다음 티어</span><strong>{selectedSeasonGame.nextCoinTier?.displayName ?? '최종 티어'}</strong></p>
              <p><span>다음 티어까지</span><strong>{remainingCoinsToNextTier !== null ? formatNumber(remainingCoinsToNextTier) : '-'}</strong></p>
              <p><span>총 자산</span><strong>{formatNumber(selectedSeasonGame.totalAssetPoints)}</strong></p>
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
              <label className="admin-page__field">
                <span>코인 잔액</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => onWalletDraftChange('coinBalance', event.target.value)}
                  type="text"
                  value={walletDraft.coinBalance}
                />
              </label>
            </div>
            <p className="admin-page__muted">
              예약 포인트는 오픈 포지션과 연결되어 있을 수 있고, 코인 잔액은 티어 상태에 직접 반영됩니다. 수동 조정은 운영 기준으로만 사용하세요.
            </p>
            <div className="admin-page__action-row">
              <button className="admin-page__button" disabled={isSaving || isDeleting} onClick={onSaveWallet} type="button">
                {isSaving ? '저장 중...' : '지갑/코인 저장'}
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

      <div className="admin-page__detail-card">
        <div className="admin-page__section-header">
          <h3 className="admin-page__section-title">보유 포지션 조정</h3>
          <span className="admin-page__section-caption">
            {selectedSeasonGame ? `${selectedSeasonGame.regionCode} · OPEN ${formatNumber(positions.length)}건` : '활성 시즌 없음'}
          </span>
        </div>
        {positions.length ? (
          <>
            <div className="admin-page__season-selector" role="tablist" aria-label="보유 포지션 선택">
              {positions.map((position) => (
                <button
                  aria-selected={position.id === selectedPositionId}
                  className="admin-page__season-tab"
                  data-active={position.id === selectedPositionId}
                  key={position.id}
                  onClick={() => onSelectPosition(position.id)}
                  role="tab"
                  type="button"
                >
                  <strong>#{position.buyRank}</strong>
                  <span>{position.title}</span>
                </button>
              ))}
            </div>
            {selectedPosition ? (
              <>
                <div className="admin-page__detail-list admin-page__detail-list--compact">
                  <p><span>영상</span><strong>{selectedPosition.title}</strong></p>
                  <p><span>채널</span><strong>{selectedPosition.channelTitle}</strong></p>
                  <p><span>카테고리</span><strong>{selectedPosition.categoryId}</strong></p>
                  <p><span>매수 랭크</span><strong>{formatNumber(selectedPosition.buyRank)}</strong></p>
                  <p><span>매수 시각</span><strong>{formatDateTime(selectedPosition.buyCapturedAt)}</strong></p>
                  <p><span>생성 시각</span><strong>{formatDateTime(selectedPosition.createdAt)}</strong></p>
                </div>
                <div className="admin-page__form-grid">
                  <label className="admin-page__field">
                    <span>수량</span>
                    <input
                      inputMode="numeric"
                      onChange={(event) => onPositionDraftChange('quantity', event.target.value)}
                      type="text"
                      value={positionDraft.quantity}
                    />
                  </label>
                  <label className="admin-page__field">
                    <span>매수 금액</span>
                    <input
                      inputMode="numeric"
                      onChange={(event) => onPositionDraftChange('stakePoints', event.target.value)}
                      type="text"
                      value={positionDraft.stakePoints}
                    />
                  </label>
                </div>
                <p className="admin-page__muted">
                  수량은 100 단위로만 수정할 수 있습니다. 매수 금액을 수정하면 지갑의 가용 포인트와 예약 포인트도 함께 보정됩니다.
                </p>
                <div className="admin-page__action-row">
                  <button className="admin-page__button" disabled={isSavingPosition} onClick={onSavePosition} type="button">
                    {isSavingPosition ? '저장 중...' : '포지션 저장'}
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="admin-page__muted">선택한 시즌에 보유 중인 OPEN 포지션이 없습니다.</p>
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
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [seasonDrafts, setSeasonDrafts] = useState<Record<number, { startAt: string; endAt: string }>>({});
  const [seasonActionState, setSeasonActionState] = useState<{ seasonId: number; type: 'save' | 'close' } | null>(null);
  const [walletDraft, setWalletDraft] = useState({
    balancePoints: '',
    reservedPoints: '',
    realizedPnlPoints: '',
    coinBalance: '',
  });
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [positionDraft, setPositionDraft] = useState({
    quantity: '',
    stakePoints: '',
  });
  const [commentCleanupDraft, setCommentCleanupDraft] = useState('');
  const [tradeHistoryCleanupDraft, setTradeHistoryCleanupDraft] = useState('');
  const [trendSnapshotRangeDraft, setTrendSnapshotRangeDraft] = useState(createDefaultSnapshotRange);
  const [submittedTrendSnapshotRange, setSubmittedTrendSnapshotRange] = useState<{
    startAt: string | null;
    endAt: string | null;
    regionCode: string | null;
  }>(() => {
    const initial = createDefaultSnapshotRange();
    return {
      ...initial,
      regionCode: null,
    };
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const dashboardQuery = useAdminDashboard(accessToken, status === 'authenticated');
  const trendSnapshotsQuery = useAdminTrendSnapshots(
    accessToken,
    submittedTrendSnapshotRange.startAt,
    submittedTrendSnapshotRange.endAt,
    submittedTrendSnapshotRange.regionCode,
    status === 'authenticated',
  );
  const usersQuery = useAdminUsers(accessToken, submittedQuery, status === 'authenticated');
  const detailQuery = useAdminUserDetail(accessToken, selectedUserId, status === 'authenticated');
  const positionsQuery = useAdminUserPositions(accessToken, selectedUserId, selectedSeasonId, status === 'authenticated');
  const updateSeasonMutation = useUpdateAdminSeasonSchedule(accessToken);
  const closeSeasonMutation = useCloseAdminSeason(accessToken);
  const updateWalletMutation = useUpdateAdminUserWallet(accessToken);
  const updatePositionMutation = useUpdateAdminUserPosition(accessToken);
  const deleteUserMutation = useDeleteAdminUser(accessToken);
  const purgeCommentsMutation = usePurgeAdminComments(accessToken);
  const purgeTradeHistoryMutation = usePurgeAdminTradeHistory(accessToken);

  useLogoutOnUnauthorized(dashboardQuery.error, logout);
  useLogoutOnUnauthorized(trendSnapshotsQuery.error, logout);
  useLogoutOnUnauthorized(usersQuery.error, logout);
  useLogoutOnUnauthorized(detailQuery.error, logout);
  useLogoutOnUnauthorized(positionsQuery.error, logout);

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
    const activeSeasons = getDashboardActiveSeasons(dashboardQuery.data);

    setSeasonDrafts((current) =>
      Object.fromEntries(
        activeSeasons.map((season) => [
          season.id,
          {
            startAt: current[season.id]?.startAt ?? formatDateTimeInput(season.startAt),
            endAt: current[season.id]?.endAt ?? formatDateTimeInput(season.endAt),
          },
        ]),
      ),
    );
  }, [dashboardQuery.data]);

  useEffect(() => {
    if (commentCleanupDraft) {
      return;
    }

    const recentCommentCreatedAt = dashboardQuery.data?.recentComments[dashboardQuery.data.recentComments.length - 1]?.createdAt;

    if (recentCommentCreatedAt) {
      setCommentCleanupDraft(formatDateTimeInput(recentCommentCreatedAt));
    }
  }, [commentCleanupDraft, dashboardQuery.data]);

  useEffect(() => {
    if (tradeHistoryCleanupDraft) {
      return;
    }

    const activeSeasonEndAt = getDashboardActiveSeasons(dashboardQuery.data)[0]?.endAt;

    if (activeSeasonEndAt) {
      setTradeHistoryCleanupDraft(formatDateTimeInput(activeSeasonEndAt));
    }
  }, [tradeHistoryCleanupDraft, dashboardQuery.data]);

  useEffect(() => {
    const activeSeasonGames = getActiveSeasonGames(detailQuery.data);
    const nextSelectedSeasonId =
      activeSeasonGames.find((item) => item.seasonId === selectedSeasonId)?.seasonId ??
      activeSeasonGames[0]?.seasonId ??
      null;

    if (nextSelectedSeasonId !== selectedSeasonId) {
      setSelectedSeasonId(nextSelectedSeasonId);
    }
  }, [detailQuery.data, selectedSeasonId]);

  useEffect(() => {
    const positions = positionsQuery.data ?? [];
    const nextSelectedPositionId =
      positions.find((item) => item.id === selectedPositionId)?.id ??
      positions[0]?.id ??
      null;

    if (nextSelectedPositionId !== selectedPositionId) {
      setSelectedPositionId(nextSelectedPositionId);
    }
  }, [positionsQuery.data, selectedPositionId]);

  useEffect(() => {
    const activeSeasonGames = getActiveSeasonGames(detailQuery.data);
    const game =
      activeSeasonGames.find((item) => item.seasonId === selectedSeasonId) ??
      activeSeasonGames[0] ??
      null;

    if (!game) {
      setWalletDraft({
        balancePoints: '',
        reservedPoints: '',
        realizedPnlPoints: '',
        coinBalance: '',
      });
      return;
    }

    setWalletDraft({
      balancePoints: String(game.balancePoints ?? 0),
      reservedPoints: String(game.reservedPoints ?? 0),
      realizedPnlPoints: String(game.realizedPnlPoints ?? 0),
      coinBalance: String(game.coinBalance ?? 0),
    });
  }, [detailQuery.data, selectedSeasonId]);

  useEffect(() => {
    const positions = positionsQuery.data ?? [];
    const position = positions.find((item) => item.id === selectedPositionId) ?? positions[0] ?? null;

    if (!position) {
      setPositionDraft({
        quantity: '',
        stakePoints: '',
      });
      return;
    }

    setPositionDraft({
      quantity: String(position.quantity),
      stakePoints: String(position.stakePoints),
    });
  }, [positionsQuery.data, selectedPositionId]);

  const errorMessage =
    dashboardQuery.error instanceof ApiRequestError
      ? dashboardQuery.error.message
        : usersQuery.error instanceof ApiRequestError
          ? usersQuery.error.message
          : detailQuery.error instanceof ApiRequestError
            ? detailQuery.error.message
            : positionsQuery.error instanceof ApiRequestError
              ? positionsQuery.error.message
              : trendSnapshotsQuery.error instanceof ApiRequestError
                ? trendSnapshotsQuery.error.message
                : '관리자 정보를 불러오지 못했습니다.';
  const isForbidden =
    dashboardQuery.error instanceof ApiRequestError && dashboardQuery.error.status === 403;

  const handleWalletDraftChange = (
    field: 'balancePoints' | 'reservedPoints' | 'realizedPnlPoints' | 'coinBalance',
    value: string,
  ) => {
    setWalletDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSeasonDraftChange = (seasonId: number, field: 'startAt' | 'endAt', value: string) => {
    setSeasonDrafts((current) => ({
      ...current,
      [seasonId]: {
        startAt: current[seasonId]?.startAt ?? '',
        endAt: current[seasonId]?.endAt ?? '',
        [field]: value,
      },
    }));
  };

  const handlePositionDraftChange = (field: 'quantity' | 'stakePoints', value: string) => {
    setPositionDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTrendSnapshotRangeChange = (field: 'startAt' | 'endAt', value: string) => {
    setTrendSnapshotRangeDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleTrendSnapshotRegionChange = (value: string) => {
    setSubmittedTrendSnapshotRange((current) => current);
    setTrendSnapshotRangeDraft((current) => ({
      ...current,
      regionCode: value,
    }));
  };

  const handleSeasonSave = (season: AdminSeasonSummary) => {
    const draft = seasonDrafts[season.id];

    try {
      const request = {
        startAt: parseDateTimeInput(draft?.startAt ?? '', '시작'),
        endAt: parseDateTimeInput(draft?.endAt ?? '', '종료'),
      };

      setActionMessage(null);
      setSeasonActionState({ seasonId: season.id, type: 'save' });
      updateSeasonMutation.mutate(
        { seasonId: season.id, request },
        {
          onSuccess: () => {
            setActionMessage(`${season.regionCode} 시즌 시간이 저장되었습니다.`);
            setSeasonActionState(null);
          },
          onError: (error) => {
            setActionMessage(error instanceof Error ? error.message : '시즌 시간 저장에 실패했습니다.');
            setSeasonActionState(null);
          },
        },
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '시즌 시간을 확인해주세요.');
    }
  };

  const handleSeasonClose = (season: AdminSeasonSummary) => {
    const confirmed = window.confirm(
      `${season.regionCode} · ${season.name} 시즌을 지금 종료할까요? 오픈 포지션 정산과 시즌 종료 처리가 바로 실행됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setActionMessage(null);
    setSeasonActionState({ seasonId: season.id, type: 'close' });
    closeSeasonMutation.mutate(season.id, {
      onSuccess: () => {
        setActionMessage(`${season.regionCode} 시즌을 종료했습니다.`);
        setSeasonActionState(null);
      },
      onError: (error) => {
        setActionMessage(error instanceof Error ? error.message : '시즌 종료에 실패했습니다.');
        setSeasonActionState(null);
      },
    });
  };

  const handleWalletSave = () => {
    if (!selectedUserId || !selectedSeasonId) {
      return;
    }

    try {
      const request = {
        seasonId: selectedSeasonId,
        balancePoints: parsePointInput(walletDraft.balancePoints, '가용 포인트'),
        reservedPoints: parsePointInput(walletDraft.reservedPoints, '예약 포인트'),
        realizedPnlPoints: parsePointInput(walletDraft.realizedPnlPoints, '실현 손익'),
        coinBalance: parsePointInput(walletDraft.coinBalance, '코인 잔액'),
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

  const handlePositionSave = () => {
    if (!selectedUserId || !selectedPositionId) {
      return;
    }

    try {
      const request = {
        quantity: parsePointInput(positionDraft.quantity, '수량'),
        stakePoints: parsePointInput(positionDraft.stakePoints, '매수 금액'),
      };

      setActionMessage(null);
      updatePositionMutation.mutate(
        { userId: selectedUserId, positionId: selectedPositionId, request },
        {
          onSuccess: () => {
            setActionMessage('보유 포지션이 저장되었습니다.');
          },
          onError: (error) => {
            setActionMessage(error instanceof Error ? error.message : '포지션 저장에 실패했습니다.');
          },
        },
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '포지션 입력값을 확인해주세요.');
    }
  };

  const handleCommentCleanup = () => {
    try {
      const deleteBefore = parseDateTimeInput(commentCleanupDraft, '댓글 정리 기준');
      const confirmed = window.confirm(
        `${formatDateTime(deleteBefore)} 이전 댓글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
      );

      if (!confirmed) {
        return;
      }

      setActionMessage(null);
      purgeCommentsMutation.mutate(
        { deleteBefore },
        {
          onSuccess: (response) => {
            setActionMessage(formatCommentCleanupMessage(response.deletedCount, response.deleteBefore));
          },
          onError: (error) => {
            setActionMessage(error instanceof Error ? error.message : '댓글 정리에 실패했습니다.');
          },
        },
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '댓글 정리 기준 시각을 확인해주세요.');
    }
  };

  const handleTradeHistoryCleanup = () => {
    try {
      const deleteBefore = parseDateTimeInput(tradeHistoryCleanupDraft, '거래내역 정리 기준');
      const confirmed = window.confirm(
        `${formatDateTime(deleteBefore)} 이전에 종료된 거래내역을 삭제할까요? 연결된 원장/지급 내역도 함께 삭제되며 이 작업은 되돌릴 수 없습니다.`,
      );

      if (!confirmed) {
        return;
      }

      setActionMessage(null);
      purgeTradeHistoryMutation.mutate(
        { deleteBefore },
        {
          onSuccess: (response) => {
            setActionMessage(
              formatTradeHistoryCleanupMessage(
                response.deletedPositionCount,
                response.deletedLedgerCount,
                response.deletedCoinPayoutCount,
                response.deletedDividendPayoutCount,
                response.deleteBefore,
              ),
            );
          },
          onError: (error) => {
            setActionMessage(error instanceof Error ? error.message : '거래내역 정리에 실패했습니다.');
          },
        },
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '거래내역 정리 기준 시각을 확인해주세요.');
    }
  };

  const handleTrendSnapshotSearch = () => {
    try {
      const startAt = parseDateTimeInput(trendSnapshotRangeDraft.startAt, '스냅샷 조회 시작');
      const endAt = parseDateTimeInput(trendSnapshotRangeDraft.endAt, '스냅샷 조회 종료');

      if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
        throw new Error('스냅샷 조회 시작 시각은 종료 시각보다 늦을 수 없습니다.');
      }

      setActionMessage(null);
      setSubmittedTrendSnapshotRange({
        startAt,
        endAt,
        regionCode: trendSnapshotRangeDraft.regionCode?.trim() ? trendSnapshotRangeDraft.regionCode : null,
      });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : '스냅샷 조회 기간을 확인해주세요.');
    }
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
            최근 사용자 활동과 댓글, 즐겨찾기, 트렌딩 수집 상태뿐 아니라 댓글 정리, 유저 지갑 수정, 탈퇴 처리까지 한 화면에서 운영할 수 있습니다.
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

      {dashboardQuery.isError || trendSnapshotsQuery.isError || usersQuery.isError || detailQuery.isError || positionsQuery.isError ? (
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
            <MetricCard label="총 거래내역" value={dashboardQuery.data.metrics.totalTradeHistories} />
          </section>

          <section className="admin-page__grid">
            <article className="admin-page__panel">
              <h2 className="admin-page__section-title">활성 시즌 현황</h2>
              {getDashboardActiveSeasons(dashboardQuery.data).length ? (
                <div className="admin-page__season-overview-list">
                  {getDashboardActiveSeasons(dashboardQuery.data).map((season) => (
                    <article className="admin-page__season-overview-card" key={season.id}>
                      <div className="admin-page__section-header">
                        <strong>{season.regionCode}</strong>
                        <span className="admin-page__pill">{season.status}</span>
                      </div>
                      <div className="admin-page__detail-list">
                        <p><span>이름</span><strong>{season.name}</strong></p>
                        <p><span>시작</span><strong>{formatDateTime(season.startAt)}</strong></p>
                        <p><span>종료</span><strong>{formatDateTime(season.endAt)}</strong></p>
                      </div>
                    </article>
                  ))}
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
                <h2 className="admin-page__section-title">스냅샷 저장 기록 조회</h2>
                <p className="admin-page__section-caption">저장 시각 기준으로 기간 내 스냅샷 레코드를 전부 조회합니다.</p>
              </div>
              {trendSnapshotsQuery.data ? (
                <span className="admin-page__section-caption">
                  {formatRegionLabel(submittedTrendSnapshotRange.regionCode)} · {formatDateTime(trendSnapshotsQuery.data.startAt)} ~ {formatDateTime(trendSnapshotsQuery.data.endAt)} · {formatNumber(trendSnapshotsQuery.data.count)}건
                </span>
              ) : null}
            </div>
            <div className="admin-page__form-grid">
              <label className="admin-page__field">
                <span>국가</span>
                <select
                  className="admin-page__select"
                  onChange={(event) => handleTrendSnapshotRegionChange(event.target.value)}
                  value={trendSnapshotRangeDraft.regionCode ?? ''}
                >
                  <option value="">전체 국가</option>
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-page__field">
                <span>조회 시작 시각</span>
                <input
                  onChange={(event) => handleTrendSnapshotRangeChange('startAt', event.target.value)}
                  type="datetime-local"
                  value={trendSnapshotRangeDraft.startAt}
                />
              </label>
              <label className="admin-page__field">
                <span>조회 종료 시각</span>
                <input
                  onChange={(event) => handleTrendSnapshotRangeChange('endAt', event.target.value)}
                  type="datetime-local"
                  value={trendSnapshotRangeDraft.endAt}
                />
              </label>
            </div>
            <div className="admin-page__action-row">
              <button
                className="admin-page__button"
                disabled={trendSnapshotsQuery.isFetching}
                onClick={handleTrendSnapshotSearch}
                type="button"
              >
                {trendSnapshotsQuery.isFetching ? '조회 중...' : '스냅샷 기록 조회'}
              </button>
            </div>
            {trendSnapshotsQuery.data ? (
              trendSnapshotsQuery.data.items.length ? (
                <div className="admin-page__table-section">
                  <TrendSnapshotHistoryTable items={trendSnapshotsQuery.data.items} />
                </div>
              ) : (
                <p className="admin-page__muted">선택한 기간에 저장된 스냅샷 기록이 없습니다.</p>
              )
            ) : null}
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
              <div>
                <h2 className="admin-page__section-title">댓글 정리</h2>
                <p className="admin-page__section-caption">기준 시각보다 오래된 채팅 로그를 한 번에 삭제합니다.</p>
              </div>
            </div>
            <div className="admin-page__form-grid">
              <label className="admin-page__field">
                <span>삭제 기준 시각</span>
                <input
                  onChange={(event) => setCommentCleanupDraft(event.target.value)}
                  type="datetime-local"
                  value={commentCleanupDraft}
                />
              </label>
            </div>
            <p className="admin-page__muted">
              입력한 시각보다 이전에 생성된 댓글만 삭제됩니다. 미래 시각은 허용되지 않으며, 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="admin-page__action-row">
              <button
                className="admin-page__button admin-page__button--danger"
                disabled={purgeCommentsMutation.isPending}
                onClick={handleCommentCleanup}
                type="button"
              >
                {purgeCommentsMutation.isPending ? '정리 중...' : '오래된 댓글 삭제'}
              </button>
            </div>
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header admin-page__section-header--stacked-mobile">
              <div>
                <h2 className="admin-page__section-title">거래내역 정리</h2>
                <p className="admin-page__section-caption">기준 시각보다 오래된 완료 거래내역과 연결된 지급 내역을 정리합니다.</p>
              </div>
            </div>
            <div className="admin-page__form-grid">
              <label className="admin-page__field">
                <span>삭제 기준 시각</span>
                <input
                  onChange={(event) => setTradeHistoryCleanupDraft(event.target.value)}
                  type="datetime-local"
                  value={tradeHistoryCleanupDraft}
                />
              </label>
            </div>
            <p className="admin-page__muted">
              입력한 시각보다 이전에 종료된 거래내역만 삭제됩니다. 보유 중인 포지션은 유지되며, 연결된 원장·코인 지급·배당 지급 기록은 함께 제거됩니다.
            </p>
            <div className="admin-page__action-row">
              <button
                className="admin-page__button admin-page__button--danger"
                disabled={purgeTradeHistoryMutation.isPending}
                onClick={handleTradeHistoryCleanup}
                type="button"
              >
                {purgeTradeHistoryMutation.isPending ? '정리 중...' : '오래된 거래내역 삭제'}
              </button>
            </div>
          </section>

          <section className="admin-page__panel">
            <div className="admin-page__section-header">
              <div>
                <h2 className="admin-page__section-title">시즌 운영</h2>
                <p className="admin-page__section-caption">시작/종료 시간을 수정하거나 시즌을 즉시 종료할 수 있습니다.</p>
              </div>
            </div>
            {getDashboardActiveSeasons(dashboardQuery.data).length ? (
              <div className="admin-page__season-management-list">
                {getDashboardActiveSeasons(dashboardQuery.data).map((season) => {
                  const draft = seasonDrafts[season.id] ?? {
                    startAt: formatDateTimeInput(season.startAt),
                    endAt: formatDateTimeInput(season.endAt),
                  };
                  const isSavingSeason = seasonActionState?.type === 'save' && seasonActionState.seasonId === season.id && updateSeasonMutation.isPending;
                  const isClosingSeason = seasonActionState?.type === 'close' && seasonActionState.seasonId === season.id && closeSeasonMutation.isPending;

                  return (
                    <article className="admin-page__season-management-card" key={season.id}>
                      <div className="admin-page__section-header">
                        <div>
                          <h3 className="admin-page__section-title">{season.regionCode} 시즌</h3>
                          <p className="admin-page__section-caption">{season.name}</p>
                        </div>
                        <span className="admin-page__pill">{season.status}</span>
                      </div>
                      <div className="admin-page__detail-list admin-page__detail-list--compact">
                        <p><span>생성일</span><strong>{formatDateTime(season.createdAt)}</strong></p>
                      </div>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field">
                          <span>시작 시각</span>
                          <input
                            onChange={(event) => handleSeasonDraftChange(season.id, 'startAt', event.target.value)}
                            type="datetime-local"
                            value={draft.startAt}
                          />
                        </label>
                        <label className="admin-page__field">
                          <span>종료 시각</span>
                          <input
                            onChange={(event) => handleSeasonDraftChange(season.id, 'endAt', event.target.value)}
                            type="datetime-local"
                            value={draft.endAt}
                          />
                        </label>
                      </div>
                      <div className="admin-page__action-row">
                        <button
                          className="admin-page__button"
                          disabled={isSavingSeason || isClosingSeason}
                          onClick={() => handleSeasonSave(season)}
                          type="button"
                        >
                          {isSavingSeason ? '저장 중...' : '시즌 시간 저장'}
                        </button>
                        <button
                          className="admin-page__button admin-page__button--danger"
                          disabled={isSavingSeason || isClosingSeason}
                          onClick={() => handleSeasonClose(season)}
                          type="button"
                        >
                          {isClosingSeason ? '종료 중...' : '시즌 즉시 종료'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="admin-page__muted">현재 운영 중인 활성 시즌이 없습니다.</p>
            )}
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
                    isSavingPosition={updatePositionMutation.isPending}
                    isDeleting={deleteUserMutation.isPending}
                    isSaving={updateWalletMutation.isPending}
                    onDeleteUser={handleDeleteUser}
                    onPositionDraftChange={handlePositionDraftChange}
                    onSaveWallet={handleWalletSave}
                    onSavePosition={handlePositionSave}
                    onSelectPosition={setSelectedPositionId}
                    onSelectSeason={setSelectedSeasonId}
                    onWalletDraftChange={handleWalletDraftChange}
                    positionDraft={positionDraft}
                    positions={positionsQuery.data ?? []}
                    selectedPositionId={selectedPositionId}
                    selectedSeasonId={selectedSeasonId}
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
