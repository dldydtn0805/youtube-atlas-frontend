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
  onSelectVideo,
  priceLabel,
  rankLabel,
  rankNumber,
  viewsLabel,
}: ChartRankingRowProps) {
  const thumbnailUrl = getVideoThumbnailUrl(item);
  const rankTone = rankNumber <= 3 ? 'top' : undefined;

  return (
    <tr className="chart-ranking-board__row" data-active={isSelected}>
      <td className="chart-ranking-board__rank-cell">
        <span data-tone={rankTone}>{rankLabel}</span>
      </td>
      <td className="chart-ranking-board__video-cell">
        <div className="chart-ranking-board__video">
          <button
            aria-label={`${item.snippet.title} 재생`}
            className="chart-ranking-board__thumb-button thumbnail-play-overlay-host thumbnail-play-overlay-host--sm"
            onClick={(event) => onSelectVideo(event.currentTarget)}
            type="button"
          >
            {thumbnailUrl ? <img alt="" className="chart-ranking-board__thumb" loading="lazy" src={thumbnailUrl} /> : null}
            <ThumbnailPlayOverlay className="chart-ranking-board__play-overlay" />
          </button>
          <div className="chart-ranking-board__video-copy">
            <button
              aria-label={`${item.snippet.title} 재생하기`}
              className="chart-ranking-board__title-button"
              onClick={(event) => onSelectVideo(event.currentTarget)}
              type="button"
            >
              <span className="chart-ranking-board__title">{item.snippet.title}</span>
            </button>
            <span className="chart-ranking-board__channel">
              {item.snippet.channelTitle}
              {badge ? (
                <span className="chart-ranking-board__tag" data-tone={badge.tone}>
                  {badge.label}
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </td>
      <td className="chart-ranking-board__price-cell">{priceLabel}</td>
      <td className="chart-ranking-board__change-cell" data-tone={badge?.tone ?? 'steady'}>
        <button
          aria-label={`${item.snippet.title} 등락 차트 보기`}
          className="chart-ranking-board__change-button"
          onClick={(event) => onOpenChart(event.currentTarget)}
          type="button"
        >
          {badge?.label ?? '-'}
        </button>
      </td>
      <td className="chart-ranking-board__views-cell">{viewsLabel}</td>
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
