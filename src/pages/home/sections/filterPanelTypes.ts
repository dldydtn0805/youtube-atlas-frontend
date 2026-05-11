export type ViewOptionTone = 'top200' | 'buy' | 'fav' | 'surge' | 'new' | 'music';

export interface ViewOption {
  id: string;
  label: string;
  disabled?: boolean;
  live?: boolean;
  tone?: ViewOptionTone;
}
