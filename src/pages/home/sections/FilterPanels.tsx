import { createPortal } from 'react-dom';
import SearchBar from '../../../components/SearchBar/SearchBar';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { getFullscreenElement } from '../utils';
import QuickRegionButtons from './QuickRegionButtons';
import QuickViewButtons from './QuickViewButtons';
import type { RegionOption, ViewOption } from './filterPanelTypes';
import './FilterPanels.css';

export interface FilterBarProps {
  onSelectRegion: (regionCode: string) => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  regionOptions: RegionOption[];
  selectedCountryName: string;
  selectedRegionCode: string;
  selectedViewId: string;
  viewOptions: ViewOption[];
}

interface RegionFilterModalProps {
  isOpen: boolean;
  onChangeRegion: (regionCode: string) => void;
  onClose: () => void;
  regionOptions: RegionOption[];
  selectedRegionCode: string;
}

export function RegionFilterModal({
  isOpen,
  onChangeRegion,
  onClose,
  regionOptions,
  selectedRegionCode,
}: RegionFilterModalProps) {
  useBodyScrollLock(isOpen);

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
          <button aria-label="국가 선택 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
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

export function FilterBar({
  onSelectRegion,
  onSelectView,
  regionOptions,
  selectedCountryName,
  selectedRegionCode,
  selectedViewId,
  viewOptions,
}: FilterBarProps) {
  return (
    <section className="app-shell__panel app-shell__panel--filters" aria-label="탐색 필터">
      <div className="app-shell__section-heading app-shell__section-heading--filters">
        <div className="app-shell__section-heading-copy">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Explore</p>
            <h2 className="app-shell__section-title">{selectedCountryName} 탐색 필터</h2>
          </div>
          <p className="app-shell__filter-helper-text">
            국가 버튼을 누르면 영상 목록이 바로 바뀌어요.
          </p>
        </div>
      </div>
      <div className="app-shell__filter-fields">
        <div className="app-shell__filter-bar" aria-label="탐색 필터 선택">
          <div className="app-shell__quick-category-group" aria-label="국가 선택">
            <QuickRegionButtons
              onSelectRegion={onSelectRegion}
              options={regionOptions}
              selectedRegionCode={selectedRegionCode}
            />
          </div>
          <div className="app-shell__quick-category-group" aria-label="차트 보기 선택">
            <QuickViewButtons onSelectView={onSelectView} options={viewOptions} selectedViewId={selectedViewId} />
          </div>
        </div>
      </div>
    </section>
  );
}
