import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { getFullscreenElement } from '../utils';
import QuickViewButtons from './QuickViewButtons';
import type { ViewOption } from './filterPanelTypes';
import './FilterPanels.css';

interface ChartViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  selectedViewId: string;
  viewOptions: ViewOption[];
}

const ChartViewModal = memo(function ChartViewModal({
  isOpen,
  onClose,
  onSelectView,
  selectedViewId,
  viewOptions,
}: ChartViewModalProps) {
  useBodyScrollLock(isOpen);

  const handleSelectView = useCallback(
    (viewId: string, triggerElement?: HTMLButtonElement) => {
      onSelectView(viewId, triggerElement);
      onClose();
    },
    [onClose, onSelectView],
  );

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
          <button aria-label="보기 모드 선택 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
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
                  onSelectView={handleSelectView}
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
});

export default ChartViewModal;
