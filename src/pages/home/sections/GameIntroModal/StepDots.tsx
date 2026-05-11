import { gameIntroSteps } from './steps';
import './controls.css';

interface StepDotsProps {
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

export default function StepDots({ currentStepIndex, onSelectStep }: StepDotsProps) {
  return (
    <div className="app-shell__game-intro-steps" aria-label="랭킹 게임 안내 단계">
      {gameIntroSteps.map((step, index) => (
        <button
          key={step.stepLabel}
          aria-current={index === currentStepIndex ? 'step' : undefined}
          aria-label={`${index + 1}단계: ${step.title}`}
          className="app-shell__game-intro-step-dot"
          data-state={index < currentStepIndex ? 'done' : index === currentStepIndex ? 'active' : 'idle'}
          onClick={() => onSelectStep(index)}
          type="button"
        />
      ))}
    </div>
  );
}
