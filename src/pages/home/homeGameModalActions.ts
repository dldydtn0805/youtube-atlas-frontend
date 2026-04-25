type GameModalTab = 'positions' | 'history';

interface OpenGameModalOptions {
  refetchGameTradePanels: () => Promise<void> | void;
  setActiveGameTab: (tab: GameModalTab) => void;
  setIsGameModalOpen: (isOpen: boolean) => void;
  shouldLoadGame: boolean;
  tab: GameModalTab;
}

export function openGameModal({
  refetchGameTradePanels,
  setActiveGameTab,
  setIsGameModalOpen,
  shouldLoadGame,
  tab,
}: OpenGameModalOptions) {
  setActiveGameTab(tab);
  setIsGameModalOpen(true);

  if (!shouldLoadGame) {
    return;
  }

  void refetchGameTradePanels();
}
