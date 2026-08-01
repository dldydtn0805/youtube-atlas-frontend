export interface MusicPlaylistExportFailure {
  message: string;
  videoId: string;
}

export interface MusicPlaylistExportResult {
  addedCount: number;
  failedItems: MusicPlaylistExportFailure[];
  playlistId: string;
  playlistUrl: string;
  requestedCount: number;
  title: string;
}

export interface MusicPlaylistExportRequest {
  googleAccessToken: string;
  regionCode: string;
  title: string;
  videoIds: string[];
}
