import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GamePanelModal from './GamePanelModal';

describe('GamePanelModal', () => {
  it('closes when an inner scroll area is pulled down from the top on touch', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    try {
      render(
        <GamePanelModal isOpen onClose={onClose}>
          <div data-testid="inner-scroll">인벤토리 목록</div>
        </GamePanelModal>,
      );

      const innerScroll = screen.getByTestId('inner-scroll');

      fireEvent.touchStart(innerScroll, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(innerScroll, { touches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      fireEvent.touchEnd(innerScroll, { changedTouches: [{ clientX: 48, clientY: 450, identifier: 1 }] });

      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(220);

      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes when a list item button is pulled down from the top on touch', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onItemClick = vi.fn();

    try {
      render(
        <GamePanelModal isOpen onClose={onClose}>
          <ul>
            <li>
              <button data-testid="inventory-item" onClick={onItemClick} type="button">
                인벤토리 항목
              </button>
            </li>
          </ul>
        </GamePanelModal>,
      );

      const inventoryItem = screen.getByTestId('inventory-item');

      fireEvent.touchStart(inventoryItem, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(inventoryItem, { touches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      fireEvent.touchEnd(inventoryItem, { changedTouches: [{ clientX: 48, clientY: 450, identifier: 1 }] });

      vi.advanceTimersByTime(220);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onItemClick).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the modal open through the body pull slack distance', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    try {
      render(
        <GamePanelModal isOpen onClose={onClose}>
          <button data-testid="inventory-item" type="button">
            인벤토리 항목
          </button>
        </GamePanelModal>,
      );

      const inventoryItem = screen.getByTestId('inventory-item');

      fireEvent.touchStart(inventoryItem, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(inventoryItem, { touches: [{ clientX: 48, clientY: 220, identifier: 1 }] });
      fireEvent.touchEnd(inventoryItem, { changedTouches: [{ clientX: 48, clientY: 220, identifier: 1 }] });
      vi.advanceTimersByTime(220);

      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the modal open when an inner scroll area is not at the top', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    try {
      render(
        <GamePanelModal isOpen onClose={onClose}>
          <div data-testid="inner-scroll">인벤토리 목록</div>
        </GamePanelModal>,
      );

      const innerScroll = screen.getByTestId('inner-scroll');
      Object.defineProperty(innerScroll, 'scrollTop', { configurable: true, value: 24 });

      fireEvent.touchStart(innerScroll, { touches: [{ clientX: 40, clientY: 20, identifier: 1 }] });
      fireEvent.touchMove(innerScroll, { touches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      fireEvent.touchEnd(innerScroll, { changedTouches: [{ clientX: 48, clientY: 450, identifier: 1 }] });
      vi.advanceTimersByTime(220);

      expect(onClose).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
