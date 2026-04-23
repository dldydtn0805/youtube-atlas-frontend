import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getFullscreenElement } from '../utils';
import BoldNumberText from './BoldNumberText';
import './GameIntroModal.css';

interface GameIntroModalProps {
  isOpen: boolean;
  onClose: (dismissForever: boolean) => void;
}

export default function GameIntroModal({ isOpen, onClose }: GameIntroModalProps) {
  const [dismissForever, setDismissForever] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDismissForever(false);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={() => onClose(dismissForever)} role="presentation">
      <section
        aria-labelledby="game-intro-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--game-intro"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">처음 오셨나요?</p>
            <h2 className="app-shell__section-title" id="game-intro-modal-title">
              랭킹 게임 안내
            </h2>
          </div>
          <button
            aria-label="랭킹 게임 안내 닫기"
            className="app-shell__modal-close"
            onClick={() => onClose(dismissForever)}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body app-shell__modal-body--game-intro">
          <div className="app-shell__modal-fields">
            <section className="app-shell__modal-field app-shell__modal-field--game-intro">
              <ol className="app-shell__game-intro-list">
                <li className="app-shell__game-intro-item">
                  <strong className="app-shell__game-intro-title">사고 팔아 포인트 벌기</strong>
                  <p className="app-shell__game-intro-copy">
                    홈에서 영상 차트를 확인하고, 순위가 오를 것 같은 영상을 싸게 사보세요. 나중에 순위가
                    오르면 비싸게 팔아 차익을 포인트로 챙길 수 있어요!
                  </p>
                </li>
                <li className="app-shell__game-intro-item">
                  <strong className="app-shell__game-intro-title">하이라이트로 티어 올리기</strong>
                  <p className="app-shell__game-intro-copy">
                    <BoldNumberText>
                      아틀라스 샷은 50위 또는 그 바깥에서 매수한 영상이 10위 안으로 진입할 때 붙는 최상위 하이라이트입니다. 문샷은 100위 바깥에서 50위 안, 스나이프는 150위 바깥에서 100위 안에 진입했을 때 붙습니다. 캐시아웃은 수익률 하이라이트로, 300% 이상은 스몰, 1,000% 이상은 빅으로 기록됩니다.
                    </BoldNumberText>
                  </p>
                </li>
                <li className="app-shell__game-intro-item">
                  <strong className="app-shell__game-intro-title">기록과 경쟁</strong>
                  <p className="app-shell__game-intro-copy">
                    <BoldNumberText>
                      거래내역에서 내가 했던 선택들을 돌아보고, 리더보드에서 다른 유저들과 이번 시즌 순위를 비교해보세요. 1위를 노려봐요!
                    </BoldNumberText>
                  </p>
                </li>
              </ol>
            </section>
          </div>
          <label className="app-shell__game-intro-dismiss">
            <input
              checked={dismissForever}
              className="app-shell__game-intro-dismiss-input"
              onChange={(event) => setDismissForever(event.target.checked)}
              type="checkbox"
            />
            <span className="app-shell__game-intro-dismiss-label">다시 보지 않기</span>
          </label>
        </div>
      </section>,
    </div>,
    container,
  );
}
