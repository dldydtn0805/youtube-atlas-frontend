import { useEffect, useState } from 'react';

export default function useMobileStickyAutoHide(enabled: boolean) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setHidden(false);
      return;
    }

    let frame = 0;
    const read = () => Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0));
    let prev = read();

    const sync = () => {
      frame = 0;
      const next = read();
      const diff = next - prev;

      if (next <= 12 || diff < -6) {
        setHidden(false);
      } else if (diff > 6) {
        setHidden(true);
      }

      if (Math.abs(diff) >= 6 || next <= 12) {
        prev = next;
      }
    };

    const schedule = () => {
      frame ||= window.requestAnimationFrame(sync);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [enabled]);

  return hidden;
}
