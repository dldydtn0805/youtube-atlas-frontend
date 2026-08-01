import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { VideoCardTradeActionState } from '../../../../components/VideoList/VideoList';
import type { VideoTrendBadge } from '../../../../features/trending/presentation';
import type { YouTubeVideoItem } from '../../../../features/youtube/types';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { getFullscreenElement, getVideoThumbnailUrl } from '../../utils';
import type { ChartRankingAction } from './types';
import './ChartRankingTradeSheet.css';

interface ChartRankingTradeSheetProps {
  actionState: VideoCardTradeActionState;
  badge: VideoTrendBadge | null;
  isOpen: boolean;
  item: YouTubeVideoItem;
  onClose: () => void;
  onOpenBuyTradeModal?: ChartRankingAction;
  onOpenSellTradeModal?: ChartRankingAction;
  playbackQueueId: string;
  priceLabel: string;
  rankLabel: string;
  viewsLabel: string;
}

function getSheetTitleId(videoId: string) {
  return `chart-ranking-trade-sheet-title-${videoId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export default function ChartRankingTradeSheet({
  actionState,
  badge,
  isOpen,
  item,
  onClose,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  playbackQueueId,
  priceLabel,
  rankLabel,
  viewsLabel,
}: ChartRankingTradeSheetProps) {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const thumbnailUrl = getVideoThumbnailUrl(item);
  const fullscreenElement = getFullscreenElement();
  const container = fullscreenElement instanceof HTMLElement ? fullscreenElement : document.body;
  const titleId = getSheetTitleId(item.id);

  return createPortal(
    <div
      className="chart-ranking-board__trade-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="chart-ranking-board__trade-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="chart-ranking-board__trade-sheet-handle" aria-hidden="true" />
        <header className="chart-ranking-board__trade-sheet-header">
          <div className="chart-ranking-board__trade-sheet-thumb thumbnail-play-overlay-host thumbnail-play-overlay-host--sm">
            {thumbnailUrl ? <img alt="" loading="lazy" src={thumbnailUrl} /> : null}
            <ThumbnailPlayOverlay className="chart-ranking-board__play-overlay" />
          </div>
          <div className="chart-ranking-board__trade-sheet-copy">
            <p className="chart-ranking-board__trade-sheet-rank">{rankLabel}</p>
            <h3 className="chart-ranking-board__trade-sheet-title" id={titleId}>
              {item.snippet.title}
            </h3>
            <p className="chart-ranking-board__trade-sheet-channel">{item.snippet.channelTitle}</p>
          </div>
          <button
            aria-label="거래 시트 닫기"
            className="chart-ranking-board__trade-sheet-close"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
        </header>
        <div className="chart-ranking-board__trade-sheet-stats">
          <span className="chart-ranking-board__trade-sheet-stat">
            <span>현재가</span>
            <strong>{priceLabel}</strong>
          </span>
          <span className="chart-ranking-board__trade-sheet-stat" data-tone={badge?.tone ?? 'steady'}>
            <span>등락</span>
            <strong>{badge?.label ?? '-'}</strong>
          </span>
          <span className="chart-ranking-board__trade-sheet-stat">
            <span>조회수</span>
            <strong>{viewsLabel}</strong>
          </span>
        </div>
        <div className="chart-ranking-board__trade-sheet-actions">
          <button
            aria-label={`${item.snippet.title} 매수`}
            className="chart-ranking-board__trade-sheet-action"
            data-variant="buy"
            disabled={!actionState.canBuy || !onOpenBuyTradeModal}
            onClick={(event) => {
              onClose();
              onOpenBuyTradeModal?.(item.id, playbackQueueId, event.currentTarget);
            }}
            title={actionState.buyTitle}
            type="button"
          >
            {actionState.buyLabel ?? '매수'}
          </button>
          <button
            aria-label={`${item.snippet.title} 매도`}
            className="chart-ranking-board__trade-sheet-action"
            data-variant="sell"
            disabled={!actionState.canSell || !onOpenSellTradeModal}
            onClick={(event) => {
              onClose();
              onOpenSellTradeModal?.(item.id, playbackQueueId, event.currentTarget);
            }}
            title={actionState.sellTitle}
            type="button"
          >
            매도
          </button>
        </div>
      </section>
    </div>,
    container,
  );
}
