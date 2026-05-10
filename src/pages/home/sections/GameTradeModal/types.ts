export interface GameTradeModalSummaryItem {
  label: string;
  tone?: 'flat' | 'gain' | 'loss';
  value: string;
}

export interface GameTradeQuickAction {
  label: string;
  quantity: number;
}
