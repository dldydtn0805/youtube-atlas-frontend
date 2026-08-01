import { memo } from "react";
import type { RegionOption } from "./filterPanelTypes";

interface QuickRegionButtonsProps {
  onSelectRegion: (regionCode: string) => void;
  options: RegionOption[];
  selectedRegionCode: string;
}

const QuickRegionButtons = memo(function QuickRegionButtons({
  onSelectRegion,
  options,
  selectedRegionCode,
}: QuickRegionButtonsProps) {
  return options.map((option) => {
    const isActive = option.value === selectedRegionCode;

    return (
      <span key={option.value} className="app-shell__quick-category-slot">
        <button
          aria-pressed={isActive}
          className="app-shell__quick-category app-shell__quick-region"
          data-active={isActive}
          onClick={() => onSelectRegion(option.value)}
          type="button"
        >
          {option.label}
        </button>
      </span>
    );
  });
});

export default QuickRegionButtons;
