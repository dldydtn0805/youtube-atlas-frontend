import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AchievementTitleCollection } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import AchievementTitlePanel from './AchievementTitlePanel';
import './AchievementTitleModal.css';

interface AchievementTitleModalProps {
  collection?: AchievementTitleCollection;
  isOpen: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSelectTitle: (titleCode: string | null) => void;
}

export default function AchievementTitleModal({
  collection,
  isOpen,
  isSaving = false,
  onClose,
  onSelectTitle,
}: AchievementTitleModalProps) {
  const [optimisticTitleCode, setOptimisticTitleCode] = useState<string | null>(null);

  useBodyScrollLock(isOpen);
  const { backdropStyle, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose,
  });

  useEffect(() => {
    setOptimisticTitleCode(collection?.selectedTitle?.code ?? null);
  }, [collection]);

  const displayCollection = useMemo(() => {
    if (!collection) {
      return collection;
    }

    const selectedTitle = optimisticTitleCode
      ? collection.titles.find((title) => title.code === optimisticTitleCode && title.earned) ?? null
      : null;

    return {
      selectedTitle,
      titles: collection.titles.map((title) => ({
        ...title,
        selected: optimisticTitleCode !== null && title.code === optimisticTitleCode,
      })),
    };
  }, [collection, optimisticTitleCode]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation" style={backdropStyle}>
      <section
        aria-labelledby="achievement-title-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--achievement-title"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Profile Title</p>
            <h2 className="app-shell__section-title" id="achievement-title-modal-title">
              칭호 변경
            </h2>
          </div>
          <button aria-label="칭호 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="app-shell__modal-body app-shell__modal-body--achievement-title">
          {isSaving ? (
            <div className="app-shell__achievement-title-saving" role="status">
              <span className="app-shell__achievement-title-saving-spinner" aria-hidden="true" />
              <span>대표 칭호 변경 중</span>
            </div>
          ) : null}
          <AchievementTitlePanel
            collection={displayCollection}
            isSaving={isSaving}
            onSelectTitle={(titleCode) => {
              setOptimisticTitleCode(titleCode);
              onSelectTitle(titleCode);
            }}
          />
        </div>
      </section>
    </div>,
    container,
  );
}
