import './AchievementTitleToast.css';

interface AchievementTitleToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function AchievementTitleToast({
  message,
  onDismiss,
}: AchievementTitleToastProps) {
  if (!message) {
    return null;
  }

  return (
    <aside className="achievement-title-toast" role="status" aria-live="polite">
      <div className="achievement-title-toast__copy">
        <strong>칭호 저장 완료</strong>
        <p>{message}</p>
      </div>
      <button
        aria-label="칭호 저장 토스트 닫기"
        className="achievement-title-toast__close"
        onClick={onDismiss}
        type="button"
      >
        닫기
      </button>
    </aside>
  );
}
