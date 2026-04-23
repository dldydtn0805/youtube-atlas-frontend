import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GameTierProgress } from '../../../features/game/types';
import { getFullscreenElement } from '../utils';
import GameTierSummary from './GameTierSummary';
import GameTierGuide from './GameTierGuide';
import './GameTierModal.css';

interface GameTierModalProps {
  defaultTab?: 'tier' | 'highlights' | 'ranking';
  highlightsContent?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  rankingContent?: ReactNode;
  tierProgress?: GameTierProgress;
}

export default function GameTierModal({
  defaultTab = 'tier',
  highlightsContent,
  isOpen,
  onClose,
  rankingContent,
  tierProgress,
}: GameTierModalProps) {
  const [activeTab, setActiveTab] = useState<'tier' | 'highlights' | 'ranking'>(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  if (!isOpen || typeof document === 'undefined' || (!tierProgress && !rankingContent && !highlightsContent)) {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="game-dividend-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--dividend"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Highlight Tier</p>
            <h2 className="app-shell__section-title" id="game-dividend-modal-title">
              티어
            </h2>
          </div>
          <button
            aria-label="티어 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body">
          <div aria-label="티어 모달 탭" className="app-shell__tier-modal-tabs" role="tablist">
            <button
              aria-selected={activeTab === 'tier'}
              className="app-shell__tier-modal-tab"
              data-active={activeTab === 'tier'}
              onClick={() => setActiveTab('tier')}
              role="tab"
              type="button"
            >
              내 카드
            </button>
            <button
              aria-selected={activeTab === 'highlights'}
              className="app-shell__tier-modal-tab"
              data-active={activeTab === 'highlights'}
              onClick={() => setActiveTab('highlights')}
              role="tab"
              type="button"
            >
              하이라이트
            </button>
            <button
              aria-selected={activeTab === 'ranking'}
              className="app-shell__tier-modal-tab"
              data-active={activeTab === 'ranking'}
              onClick={() => setActiveTab('ranking')}
              role="tab"
              type="button"
            >
              랭킹
            </button>
          </div>

          {activeTab === 'tier' ? (
            <div className="app-shell__modal-fields" role="tabpanel">
              {tierProgress ? (
                <section className="app-shell__modal-field app-shell__modal-field--tier">
                  <GameTierSummary
                    progress={tierProgress}
                    showLadder={false}
                    surfaceVariant="highlight-tier"
                    title=""
                  />
                </section>
              ) : null}

              <section className="app-shell__modal-field">
                <div className="app-shell__section-heading">
                  <p className="app-shell__section-eyebrow">티어 설명</p>
                  <h3 className="app-shell__modal-field-title">하이라이트 티어 기준</h3>
                </div>
                <GameTierGuide />
              </section>
            </div>
          ) : activeTab === 'highlights' ? (
            <div className="app-shell__tier-modal-panel" role="tabpanel">
              {highlightsContent ?? <p className="app-shell__game-empty">하이라이트를 불러올 수 없습니다.</p>}
            </div>
          ) : (
            <div className="app-shell__tier-modal-panel" role="tabpanel">
              {rankingContent ?? <p className="app-shell__game-empty">랭킹 정보를 불러올 수 없습니다.</p>}
            </div>
          )}
        </div>
      </section>
    </div>,
    container,
  );
}
