import { createPortal } from 'react-dom';
import SearchBar, { type SearchBarOption } from '../../../components/SearchBar/SearchBar';
import { getFullscreenElement } from '../utils';
import './FilterPanels.css';

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
  onOpenRegionModal: () => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  selectedCountryName: string;
  selectedViewId: string;
  viewOptions: ViewOption[];
}

interface RegionFilterModalProps {
  isOpen: boolean;
  onChangeRegion: (regionCode: string) => void;
  onClose: () => void;
  regionOptions: SearchBarOption[];
  selectedRegionCode: string;
}

interface ChartViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  selectedViewId: string;
  viewOptions: ViewOption[];
}

export function RegionFilterModal({
  isOpen,
  onChangeRegion,
  onClose,
  regionOptions,
  selectedRegionCode,
}: RegionFilterModalProps) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="app-shell__modal app-shell__modal--region-filter"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Region</p>
            <h2 className="app-shell__section-title">국가 선택</h2>
          </div>
          <button className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="app-shell__modal-body">
          <div className="app-shell__modal-fields">
            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Location</p>
                <h3 className="app-shell__modal-field-title">탐색 국가</h3>
              </div>
              <p className="app-shell__modal-field-copy">
                지역 제한이 걸려 있는 일부 영상은 감상할 수 없습니다.
              </p>
              <SearchBar
                ariaLabel="국가 선택"
                onChange={onChangeRegion}
                options={regionOptions}
                value={selectedRegionCode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    container,
  );
}

export function ChartViewModal({
  isOpen,
  onClose,
  onSelectView,
  selectedViewId,
  viewOptions,
}: ChartViewModalProps) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="app-shell__modal app-shell__modal--chart-view-filter"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">View Mode</p>
            <h2 className="app-shell__section-title">보기 모드 선택</h2>
          </div>
          <button className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="app-shell__modal-body">
          <div className="app-shell__modal-fields">
            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Explore</p>
                <h3 className="app-shell__modal-field-title">차트 보기</h3>
              </div>
              <p className="app-shell__modal-field-copy">
                헤더 라벨을 눌러 원하는 보기 모드로 바로 전환할 수 있어요.
              </p>
              <div className="app-shell__modal-view-options" aria-label="보기 모드 선택">
                <QuickViewButtons
                  onSelectView={(viewId, triggerElement) => {
                    onSelectView(viewId, triggerElement);
                    onClose();
                  }}
                  options={viewOptions}
                  selectedViewId={selectedViewId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    container,
  );
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
  onOpenRegionModal,
  onSelectView,
  selectedCountryName,
  selectedViewId,
  viewOptions,
}: FilterBarProps) {
  return (
    <section className="app-shell__panel app-shell__panel--filters" aria-label="탐색 필터">
      <div className="app-shell__section-heading app-shell__section-heading--filters">
        <div className="app-shell__section-heading-copy">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Explore</p>
            <h2 className="app-shell__section-title">
              <button className="app-shell__section-title-button" onClick={onOpenRegionModal} type="button">
                {selectedCountryName}
              </button>{' '}
              탐색 필터
            </h2>
          </div>
          <p className="app-shell__filter-helper-text">
            국가명을 클릭하면 다른 국가 차트로 바꿀 수 있어요.
          </p>
        </div>
      </div>
      <div className="app-shell__filter-fields">
        <div className="app-shell__filter-bar" aria-label="탐색 필터 선택">
          <div className="app-shell__quick-category-group" aria-label="차트 보기 선택">
            <QuickViewButtons onSelectView={onSelectView} options={viewOptions} selectedViewId={selectedViewId} />
          </div>
        </div>
      </div>
    </section>
  );
}
