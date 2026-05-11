import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { VideoCardTradeActionState } from '../../../../components/VideoList/VideoList';
import type { VideoTrendBadge } from '../../../../features/trending/presentation';
import type { YouTubeVideoItem } from '../../../../features/youtube/types';
import { getVideoThumbnailUrl } from '../../utils';
import ChartRankingActions from './ChartRankingActions';

interface ChartRankingRowProps {
  actionState?: VideoCardTradeActionState;
  badge: VideoTrendBadge | null;
  isSelected: boolean;
  item: YouTubeVideoItem;
  onOpenBuyTradeModal?: (triggerElement: HTMLButtonElement) => void;
  onOpenChart: (triggerElement: HTMLButtonElement) => void;
  onOpenSellTradeModal?: (triggerElement: HTMLButtonElement) => void;
  onOpenTradeSheet?: () => void;
  onSelectVideo: (triggerElement: HTMLButtonElement) => void;
  priceLabel: string;
  rankLabel: string;
  rankNumber: number;
  viewsLabel: string;
}

export default function ChartRankingRow({
  actionState,
  badge,
  isSelected,
  item,
  onOpenBuyTradeModal,
  onOpenChart,
  onOpenSellTradeModal,
  onOpenTradeSheet,
  onSelectVideo,
  priceLabel,
  rankLabel,
  rankNumber,
  viewsLabel,
}: ChartRankingRowProps) {
  const thumbnailUrl = getVideoThumbnailUrl(item);
  const rankTone = rankNumber <= 3 ? 'top' : undefined;
  const isTradeSheetEnabled = Boolean(onOpenTradeSheet);

  return (
    <tr
      aria-label={isTradeSheetEnabled ? `${item.snippet.title} 거래 시트 열기` : undefined}
      className="chart-ranking-board__row"
      data-active={isSelected}
      data-clickable={isTradeSheetEnabled ? 'true' : undefined}
      onClick={onOpenTradeSheet}
      onKeyDown={
        isTradeSheetEnabled
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenTradeSheet?.();
              }
            }
          : undefined
      }
      tabIndex={isTradeSheetEnabled ? 0 : undefined}
    >
      <td className="chart-ranking-board__rank-cell">
        <span data-tone={rankTone}>{rankLabel}</span>
      </td>
      <td className="chart-ranking-board__video-cell">
        <div className="chart-ranking-board__video">
          <button
            aria-label={`${item.snippet.title} 재생`}
            className="chart-ranking-board__thumb-button thumbnail-play-overlay-host thumbnail-play-overlay-host--sm"
            onClick={(event) => {
              event.stopPropagation();
              onSelectVideo(event.currentTarget);
            }}
            type="button"
          >
            {thumbnailUrl ? <img alt="" className="chart-ranking-board__thumb" loading="lazy" src={thumbnailUrl} /> : null}
            <ThumbnailPlayOverlay className="chart-ranking-board__play-overlay" />
          </button>
          <div className="chart-ranking-board__video-copy">
            <button
              aria-label={`${item.snippet.title} 재생하기`}
              className="chart-ranking-board__title-button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectVideo(event.currentTarget);
              }}
              type="button"
            >
              <span className="chart-ranking-board__title">{item.snippet.title}</span>
            </button>
            <span className="chart-ranking-board__channel">{item.snippet.channelTitle}</span>
          </div>
        </div>
      </td>
      <td className="chart-ranking-board__price-cell">{priceLabel}</td>
      <td className="chart-ranking-board__views-cell">{viewsLabel}</td>
      <td className="chart-ranking-board__change-cell" data-tone={badge?.tone ?? 'steady'}>
        <button
          aria-label={`${item.snippet.title} 등락 차트 보기`}
          className="chart-ranking-board__change-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenChart(event.currentTarget);
          }}
          type="button"
        >
          {badge?.label ?? '-'}
        </button>
      </td>
      <td className="chart-ranking-board__action-cell">
        <ChartRankingActions
          buyAriaLabel={`${item.snippet.title} 매수`}
          onBuy={(triggerElement) => onOpenBuyTradeModal?.(triggerElement)}
          onSell={(triggerElement) => onOpenSellTradeModal?.(triggerElement)}
          sellAriaLabel={`${item.snippet.title} 매도`}
          state={actionState}
        />
      </td>
    </tr>
  );
}
