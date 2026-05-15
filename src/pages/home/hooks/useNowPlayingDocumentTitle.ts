import { useEffect } from 'react';

const DEFAULT_DOCUMENT_TITLE = 'YouTube Atlas | 지역별 YouTube 트렌드 탐색 앱';
const APP_TITLE_SUFFIX = 'YouTube Atlas';

function getNowPlayingDocumentTitle(videoTitle?: string) {
  const normalizedTitle = videoTitle?.trim();

  return normalizedTitle ? `${normalizedTitle} | ${APP_TITLE_SUFFIX}` : DEFAULT_DOCUMENT_TITLE;
}

function useNowPlayingDocumentTitle(videoTitle?: string) {
  useEffect(() => {
    document.title = getNowPlayingDocumentTitle(videoTitle);

    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [videoTitle]);
}

export { DEFAULT_DOCUMENT_TITLE, getNowPlayingDocumentTitle };
export default useNowPlayingDocumentTitle;
