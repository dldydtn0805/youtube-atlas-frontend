const AXIS_DOMINANCE_RATIO = 1.1;
const AXIS_LEAD_MULTIPLIER = 0.5;
const FALLBACK_LOCK_MULTIPLIER = 2.4;

export function resolveSwipeDirection(
  deltaX: number,
  deltaY: number,
  threshold: number,
): 'horizontal' | 'vertical' | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < threshold && absY < threshold) {
    return null;
  }

  const axisLeadThreshold = threshold * AXIS_LEAD_MULTIPLIER;

  if (
    absX >= threshold &&
    (absX >= absY * AXIS_DOMINANCE_RATIO || absX - absY >= axisLeadThreshold)
  ) {
    return 'horizontal';
  }

  if (
    absY >= threshold &&
    (absY >= absX * AXIS_DOMINANCE_RATIO || absY - absX >= axisLeadThreshold)
  ) {
    return 'vertical';
  }

  if (Math.max(absX, absY) >= threshold * FALLBACK_LOCK_MULTIPLIER) {
    return absX >= absY ? 'horizontal' : 'vertical';
  }

  return null;
}
