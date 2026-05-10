import type { GameHighlightSortMode } from './gameHighlightSorting';
import './GameHighlightSortControl.css';

interface GameHighlightSortControlProps {
  sortMode: GameHighlightSortMode;
  onChange: (sortMode: GameHighlightSortMode) => void;
}

const SORT_OPTIONS: ReadonlyArray<{ label: string; mode: GameHighlightSortMode }> = [
  { label: '최신순', mode: 'latest' },
  { label: '티어 점수순', mode: 'tierScore' },
];

export default function GameHighlightSortControl({
  sortMode,
  onChange,
}: GameHighlightSortControlProps) {
  return (
    <div className="game-highlight-sort" aria-label="하이라이트 정렬">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.mode}
          aria-pressed={sortMode === option.mode}
          className="game-highlight-sort__button"
          onClick={() => onChange(option.mode)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
