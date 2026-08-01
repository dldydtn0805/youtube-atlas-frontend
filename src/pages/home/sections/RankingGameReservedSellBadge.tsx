import './RankingGameReservedSellBadge.css';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { GameScheduledSellOrder } from '../../../features/game/types';
import type { OpenGameHolding } from '../gameHelpers';
import { getPendingScheduledSellOrdersForHolding } from '../scheduledSellOrderFocus';
import { getFullscreenElement } from '../utils';
import RankingGameReservedSellOrderMenu from './RankingGameReservedSellOrderMenu';

interface RankingGameReservedSellBadgeProps {
  holding: OpenGameHolding;
  isCancelingOrderId?: number | null;
  onCancelScheduledSellOrder?: (orderId: number) => void;
  scheduledSellOrders?: GameScheduledSellOrder[];
}

const RESERVED_SELL_MENU_GAP_PX = 6;
const RESERVED_SELL_MENU_MARGIN_PX = 8;
const RESERVED_SELL_MENU_MIN_HEIGHT_PX = 96;

function buildFallbackScheduledSellOrder(
  holding: OpenGameHolding,
  orderId: number,
): GameScheduledSellOrder {
  return {
    buyRank: holding.buyRank,
    canceledAt: null,
    channelTitle: holding.channelTitle,
    createdAt: holding.createdAt,
    currentRank: holding.currentRank,
    executedAt: null,
    failureReason: null,
    id: orderId,
    pnlPoints: null,
    positionId: holding.positionId,
    quantity: holding.scheduledSellQuantity,
    regionCode: '',
    seasonId: 0,
    sellPricePoints: null,
    settledPoints: null,
    stakePoints: holding.stakePoints,
    status: 'PENDING',
    triggerType: holding.scheduledSellTriggerType ?? 'RANK',
    targetRank: holding.scheduledSellTargetRank ?? null,
    targetProfitRatePercent: holding.scheduledSellTargetProfitRatePercent ?? null,
    thumbnailUrl: holding.thumbnailUrl,
    triggeredAt: null,
    triggerDirection: holding.scheduledSellTriggerDirection ?? 'RANK_IMPROVES_TO',
    updatedAt: holding.createdAt,
    userId: 0,
    videoId: holding.videoId,
    videoTitle: holding.title,
  };
}

export default function RankingGameReservedSellBadge({
  holding,
  isCancelingOrderId = null,
  onCancelScheduledSellOrder,
  scheduledSellOrders = [],
}: RankingGameReservedSellBadgeProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const menuRef = useRef<HTMLSpanElement | null>(null);
  const reservedSellOrders = useMemo(
    () => getPendingScheduledSellOrdersForHolding(holding, scheduledSellOrders),
    [holding, scheduledSellOrders],
  );
  const portalTarget =
    typeof document === 'undefined'
      ? null
      : getFullscreenElement() instanceof HTMLElement
        ? getFullscreenElement()
        : document.body;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        (rootRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return;
      }

      setIsMenuOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen || typeof window === 'undefined') {
      setMenuStyle(null);
      return undefined;
    }

    const updateMenuPosition = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();

      if (!triggerRect) {
        return;
      }

      const maxMenuWidth = window.innerWidth - RESERVED_SELL_MENU_MARGIN_PX * 2;
      const menuWidth = Math.min(menuRef.current?.offsetWidth ?? maxMenuWidth, maxMenuWidth);
      const menuHeight = menuRef.current?.offsetHeight ?? RESERVED_SELL_MENU_MIN_HEIGHT_PX;
      const availableAbove = Math.max(
        0,
        triggerRect.top - RESERVED_SELL_MENU_GAP_PX - RESERVED_SELL_MENU_MARGIN_PX,
      );
      const availableBelow = Math.max(
        0,
        window.innerHeight - triggerRect.bottom - RESERVED_SELL_MENU_GAP_PX - RESERVED_SELL_MENU_MARGIN_PX,
      );
      const shouldOpenAbove =
        availableAbove >= Math.min(menuHeight, RESERVED_SELL_MENU_MIN_HEIGHT_PX) ||
        availableAbove >= availableBelow;
      const maxHeight = Math.max(
        RESERVED_SELL_MENU_MIN_HEIGHT_PX,
        shouldOpenAbove ? availableAbove : availableBelow,
      );
      const renderedHeight = Math.min(menuHeight, maxHeight);
      const left = Math.min(
        Math.max(RESERVED_SELL_MENU_MARGIN_PX, triggerRect.left),
        window.innerWidth - menuWidth - RESERVED_SELL_MENU_MARGIN_PX,
      );
      const top = shouldOpenAbove
        ? Math.max(
            RESERVED_SELL_MENU_MARGIN_PX,
            triggerRect.top - renderedHeight - RESERVED_SELL_MENU_GAP_PX,
          )
        : Math.min(
            triggerRect.bottom + RESERVED_SELL_MENU_GAP_PX,
            window.innerHeight - renderedHeight - RESERVED_SELL_MENU_MARGIN_PX,
          );

      setMenuStyle({
        left,
        maxWidth: maxMenuWidth,
        maxHeight,
        top,
        visibility: 'visible',
      });
    };

    updateMenuPosition();
    const animationFrameId = window.requestAnimationFrame(updateMenuPosition);

    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isMenuOpen, reservedSellOrders.length]);

  if (!holding.reservedForSell && reservedSellOrders.length === 0) {
    return null;
  }

  const label = '예약 매도 중';
  const canCancelScheduledOrder = Boolean(onCancelScheduledSellOrder);
  const directOrderId = reservedSellOrders[0]?.id ?? holding.scheduledSellOrderId ?? undefined;
  const menuOrders =
    reservedSellOrders.length > 0
      ? reservedSellOrders
      : typeof directOrderId === 'number'
        ? [buildFallbackScheduledSellOrder(holding, directOrderId)]
        : [];
  const hasOrderMenu = menuOrders.length > 0;
  const isDirectOrderCanceling = directOrderId === isCancelingOrderId;

  if (!canCancelScheduledOrder) {
    return (
      <span className="app-shell__game-position-trend" data-tone="info">
        {label}
      </span>
    );
  }

  const stopNestedAction = (event: KeyboardEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    stopNestedAction(event);

    if (hasOrderMenu) {
      setIsMenuOpen((currentIsMenuOpen) => !currentIsMenuOpen);
    }
  };
  const handleCancelOrder = (orderId: number) => {
    setIsMenuOpen(false);
    onCancelScheduledSellOrder?.(orderId);
  };

  return (
    <span
      ref={rootRef}
      className="app-shell__game-reserved-sell"
      data-open={isMenuOpen || undefined}
    >
      <button
        aria-expanded={hasOrderMenu ? isMenuOpen : undefined}
        aria-haspopup={hasOrderMenu ? 'menu' : undefined}
        aria-label={`${holding.title} 예약 매도 취소`}
        className="app-shell__game-position-trend app-shell__game-position-trend-button"
        data-tone="info"
        disabled={isDirectOrderCanceling && !hasOrderMenu}
        onClick={handleClick}
        onKeyDown={stopNestedAction}
        title={hasOrderMenu ? '예약 주문 선택' : '예약 주문 취소'}
        type="button"
      >
        {isDirectOrderCanceling && !hasOrderMenu ? '취소 중' : label}
      </button>
      {isMenuOpen && portalTarget
        ? createPortal(
            <RankingGameReservedSellOrderMenu
              ref={menuRef}
              holdingTitle={holding.title}
              isCancelingOrderId={isCancelingOrderId}
              orders={menuOrders}
              onCancelOrder={handleCancelOrder}
              style={menuStyle ?? { visibility: 'hidden' }}
            />,
            portalTarget,
          )
        : null}
    </span>
  );
}
