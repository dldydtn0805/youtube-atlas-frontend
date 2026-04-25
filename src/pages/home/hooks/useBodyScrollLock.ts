import { useEffect } from 'react';

const BODY_SCROLL_LOCK_COUNT_KEY = 'appBodyScrollLockCount';
const HTML_OVERFLOW_KEY = 'appHtmlOverflow';
const BODY_OVERFLOW_KEY = 'appBodyOverflow';
const BODY_OVERSCROLL_KEY = 'appBodyOverscrollBehavior';

export default function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const nextLockCount = Number(body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] ?? '0') + 1;

    body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] = String(nextLockCount);

    if (nextLockCount === 1) {
      body.dataset[HTML_OVERFLOW_KEY] = documentElement.style.overflow;
      body.dataset[BODY_OVERFLOW_KEY] = body.style.overflow;
      body.dataset[BODY_OVERSCROLL_KEY] = body.style.overscrollBehavior;

      documentElement.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
    }

    return () => {
      const currentLockCount = Number(body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] ?? '1') - 1;

      if (currentLockCount > 0) {
        body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] = String(currentLockCount);
        return;
      }

      delete body.dataset[BODY_SCROLL_LOCK_COUNT_KEY];

      documentElement.style.overflow = body.dataset[HTML_OVERFLOW_KEY] ?? '';
      body.style.overflow = body.dataset[BODY_OVERFLOW_KEY] ?? '';
      body.style.overscrollBehavior = body.dataset[BODY_OVERSCROLL_KEY] ?? '';

      delete body.dataset[HTML_OVERFLOW_KEY];
      delete body.dataset[BODY_OVERFLOW_KEY];
      delete body.dataset[BODY_OVERSCROLL_KEY];
    };
  }, [isLocked]);
}
