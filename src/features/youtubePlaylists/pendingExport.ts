const PENDING_MUSIC_PLAYLIST_EXPORT_KEY = 'youtube-atlas-pending-music-playlist-export';
const PENDING_EXPORT_TTL_MS = 10 * 60 * 1000;

export interface PendingMusicPlaylistExport {
  regionCode: string;
  requestedAt: number;
  title: string;
  videoIds: string[];
}

function isPendingMusicPlaylistExport(value: unknown): value is PendingMusicPlaylistExport {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.regionCode === 'string' &&
    typeof candidate.requestedAt === 'number' &&
    typeof candidate.title === 'string' &&
    Array.isArray(candidate.videoIds) &&
    candidate.videoIds.length > 0 &&
    candidate.videoIds.length <= 20 &&
    candidate.videoIds.every((videoId) => typeof videoId === 'string' && videoId.length > 0)
  );
}

export function clearPendingMusicPlaylistExport() {
  window.sessionStorage.removeItem(PENDING_MUSIC_PLAYLIST_EXPORT_KEY);
}

export function readPendingMusicPlaylistExport(now = Date.now()) {
  const storedValue = window.sessionStorage.getItem(PENDING_MUSIC_PLAYLIST_EXPORT_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    if (
      isPendingMusicPlaylistExport(parsedValue) &&
      now - parsedValue.requestedAt <= PENDING_EXPORT_TTL_MS
    ) {
      return parsedValue;
    }
  } catch {
    // Clear malformed state below.
  }

  clearPendingMusicPlaylistExport();
  return null;
}

export function writePendingMusicPlaylistExport(value: PendingMusicPlaylistExport) {
  window.sessionStorage.setItem(PENDING_MUSIC_PLAYLIST_EXPORT_KEY, JSON.stringify(value));
}
