import SearchBar, { type SearchBarOption } from '../../../components/SearchBar/SearchBar';

interface ViewOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface QuickViewButtonsProps {
  options: ViewOption[];
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  selectedViewId: string;
}

interface FilterBarProps {
  onChangeRegion: (regionCode: string) => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  regionOptions: SearchBarOption[];
  selectedRegionCode: string;
  selectedCountryName: string;
  selectedViewId: string;
  selectedViewLabel: string;
  viewHelperText?: string;
  viewOptions: ViewOption[];
}

function QuickViewButtons({ options, onSelectView, selectedViewId }: QuickViewButtonsProps) {
  return (
    <>
      {options.map((option) => (
        <button
          key={option.id}
          className="app-shell__quick-category"
          data-active={option.id === selectedViewId}
          disabled={option.disabled}
          onClick={(event) => onSelectView(option.id, event.currentTarget)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </>
  );
}

export function FilterBar({
  onChangeRegion,
  onSelectView,
  regionOptions,
  selectedCountryName,
  selectedRegionCode,
  selectedViewId,
  selectedViewLabel,
  viewHelperText,
  viewOptions,
}: FilterBarProps) {
  return (
    <section className="app-shell__panel app-shell__panel--filters" aria-label="탐색 필터">
      <div className="app-shell__section-heading app-shell__section-heading--filters">
        <div className="app-shell__section-heading-copy">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Explore</p>
            <h2 className="app-shell__section-title">탐색 필터</h2>
          </div>
          <p className="app-shell__filter-summary-text">
            {selectedCountryName} · {selectedViewLabel}
          </p>
        </div>
      </div>
      <div className="app-shell__filter-fields">
        <div className="app-shell__modal-field">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Region</p>
            <h3 className="app-shell__modal-field-title">국가</h3>
          </div>
          <SearchBar
            ariaLabel="국가 선택"
            helperText="게임 기능은 현재 대한민국에서만 지원합니다."
            onChange={onChangeRegion}
            options={regionOptions}
            value={selectedRegionCode}
          />
        </div>

        <div className="app-shell__modal-field">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Views</p>
            <h3 className="app-shell__modal-field-title">카테고리</h3>
          </div>
          <p className="app-shell__modal-field-copy">
            {viewHelperText ?? '전체 차트를 기준으로 원하는 보기 모드를 바로 전환합니다.'}
          </p>
          <div className="app-shell__quick-category-group" aria-label="차트 보기 선택">
            <QuickViewButtons
              onSelectView={onSelectView}
              options={viewOptions}
              selectedViewId={selectedViewId}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
