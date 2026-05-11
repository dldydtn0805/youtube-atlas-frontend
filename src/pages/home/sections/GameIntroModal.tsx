import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import './GameIntroModal.css';
import Footer from './GameIntroModal/Footer';
import StepDots from './GameIntroModal/StepDots';
import StepPreview from './GameIntroModal/StepPreview';
import { gameIntroSteps } from './GameIntroModal/steps';

interface GameIntroModalProps {
  isOpen: boolean;
  onClose: (dismissForever: boolean) => void;
}

export default function GameIntroModal({ isOpen, onClose }: GameIntroModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dismissForever, setDismissForever] = useState(false);
  const currentStep = gameIntroSteps[currentStepIndex];
  const isLastStep = currentStepIndex === gameIntroSteps.length - 1;

  useBodyScrollLock(isOpen);
  const { backdropStyle, bodySwipeHandlers, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose: () => onClose(dismissForever),
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setDismissForever(false);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const handleClose = () => onClose(dismissForever);
  const handleNext = () => {
    if (isLastStep) {
      handleClose();
      return;
    }

    setCurrentStepIndex((stepIndex) => stepIndex + 1);
  };

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={handleClose} role="presentation" style={backdropStyle}>
      <section
        aria-labelledby="game-intro-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--game-intro"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">처음 오셨나요?</p>
            <h2 className="app-shell__section-title" id="game-intro-modal-title">
              랭킹 게임 안내
            </h2>
          </div>
          <button aria-label="랭킹 게임 안내 닫기" className="app-shell__modal-close" onClick={handleClose} type="button">
            닫기
          </button>
        </div>

        <StepDots currentStepIndex={currentStepIndex} onSelectStep={setCurrentStepIndex} />

        <div className="app-shell__modal-body app-shell__modal-body--game-intro" {...bodySwipeHandlers}>
          <section className="app-shell__game-intro-card" aria-live="polite">
            <p className="app-shell__game-intro-step-label">{currentStep.stepLabel}</p>
            <h3 className="app-shell__game-intro-title">{currentStep.title}</h3>
            <StepPreview type={currentStep.previewType} />
            <p className="app-shell__game-intro-copy">{currentStep.body}</p>
          </section>
        </div>

        <Footer
          dismissForever={dismissForever}
          isLastStep={isLastStep}
          onDismissForeverChange={setDismissForever}
          onNext={handleNext}
        />
      </section>
    </div>,
    container,
  );
}
