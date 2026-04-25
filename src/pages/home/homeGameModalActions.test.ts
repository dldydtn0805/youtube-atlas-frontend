import { describe, expect, it, vi } from 'vitest';
import { openGameModal } from './homeGameModalActions';

describe('openGameModal', () => {
  it('opens the game modal and refetches trade panels when game data can load', () => {
    const setActiveGameTab = vi.fn();
    const setIsGameModalOpen = vi.fn();
    const refetchGameTradePanels = vi.fn();

    openGameModal({
      refetchGameTradePanels,
      setActiveGameTab,
      setIsGameModalOpen,
      shouldLoadGame: true,
      tab: 'positions',
    });

    expect(setActiveGameTab).toHaveBeenCalledWith('positions');
    expect(setIsGameModalOpen).toHaveBeenCalledWith(true);
    expect(refetchGameTradePanels).toHaveBeenCalledTimes(1);
  });

  it('opens the game modal without refetching when game data should not load', () => {
    const setActiveGameTab = vi.fn();
    const setIsGameModalOpen = vi.fn();
    const refetchGameTradePanels = vi.fn();

    openGameModal({
      refetchGameTradePanels,
      setActiveGameTab,
      setIsGameModalOpen,
      shouldLoadGame: false,
      tab: 'history',
    });

    expect(setActiveGameTab).toHaveBeenCalledWith('history');
    expect(setIsGameModalOpen).toHaveBeenCalledWith(true);
    expect(refetchGameTradePanels).not.toHaveBeenCalled();
  });
});
