import './controls.css';

interface FooterProps {
  dismissForever: boolean;
  isLastStep: boolean;
  onDismissForeverChange: (dismissForever: boolean) => void;
  onNext: () => void;
}

function NextArrowIcon() {
  return (
    <svg aria-hidden="true" className="app-shell__game-intro-next-icon" fill="none" viewBox="0 0 20 20">
      <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function Footer({
  dismissForever,
  isLastStep,
  onDismissForeverChange,
  onNext,
}: FooterProps) {
  return (
    <div className="app-shell__game-intro-footer">
      <label className="app-shell__game-intro-dismiss">
        <input
          checked={dismissForever}
          className="app-shell__game-intro-dismiss-input"
          onChange={(event) => onDismissForeverChange(event.target.checked)}
          type="checkbox"
        />
        <span className="app-shell__game-intro-dismiss-label">다시 보지 않기</span>
      </label>
      <button className="app-shell__game-intro-next" onClick={onNext} type="button">
        <span>{isLastStep ? '시작하기' : '다음'}</span>
        {!isLastStep ? <NextArrowIcon /> : null}
      </button>
    </div>
  );
}
