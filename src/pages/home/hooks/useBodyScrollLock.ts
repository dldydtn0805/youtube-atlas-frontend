import { useEffect } from 'react';

const BODY_SCROLL_LOCK_COUNT_KEY = 'appBodyScrollLockCount';
const HTML_OVERFLOW_KEY = 'appHtmlOverflow';
const BODY_OVERFLOW_KEY = 'appBodyOverflow';
const BODY_OVERSCROLL_KEY = 'appBodyOverscrollBehavior';
const BODY_POSITION_KEY = 'appBodyPosition';
const BODY_TOP_KEY = 'appBodyTop';
const BODY_LEFT_KEY = 'appBodyLeft';
const BODY_RIGHT_KEY = 'appBodyRight';
const BODY_WIDTH_KEY = 'appBodyWidth';
const BODY_SCROLL_X_KEY = 'appBodyScrollX';
const BODY_SCROLL_Y_KEY = 'appBodyScrollY';
const ROOT_SCROLL_LOCKED_KEY = 'appBodyScrollLocked';

export default function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const nextLockCount = Number(body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] ?? '0') + 1;

    body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] = String(nextLockCount);

    if (nextLockCount === 1) {
      body.dataset[HTML_OVERFLOW_KEY] = documentElement.style.overflow;
      body.dataset[BODY_OVERFLOW_KEY] = body.style.overflow;
      body.dataset[BODY_OVERSCROLL_KEY] = body.style.overscrollBehavior;
      body.dataset[BODY_POSITION_KEY] = body.style.position;
      body.dataset[BODY_TOP_KEY] = body.style.top;
      body.dataset[BODY_LEFT_KEY] = body.style.left;
      body.dataset[BODY_RIGHT_KEY] = body.style.right;
      body.dataset[BODY_WIDTH_KEY] = body.style.width;
      body.dataset[BODY_SCROLL_X_KEY] = String(window.scrollX);
      body.dataset[BODY_SCROLL_Y_KEY] = String(window.scrollY);

      documentElement.style.overflow = 'hidden';
      documentElement.dataset[ROOT_SCROLL_LOCKED_KEY] = 'true';
      body.style.overflow = 'hidden';
      body.style.overscrollBehavior = 'none';
      body.style.position = 'fixed';
      body.style.top = `-${window.scrollY}px`;
      body.style.left = `-${window.scrollX}px`;
      body.style.right = '0';
      body.style.width = '100%';
    }

    return () => {
      const currentLockCount = Number(body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] ?? '1') - 1;

      if (currentLockCount > 0) {
        body.dataset[BODY_SCROLL_LOCK_COUNT_KEY] = String(currentLockCount);
        return;
      }

      delete body.dataset[BODY_SCROLL_LOCK_COUNT_KEY];

      documentElement.style.overflow = body.dataset[HTML_OVERFLOW_KEY] ?? '';
      delete documentElement.dataset[ROOT_SCROLL_LOCKED_KEY];
      body.style.overflow = body.dataset[BODY_OVERFLOW_KEY] ?? '';
      body.style.overscrollBehavior = body.dataset[BODY_OVERSCROLL_KEY] ?? '';
      body.style.position = body.dataset[BODY_POSITION_KEY] ?? '';
      body.style.top = body.dataset[BODY_TOP_KEY] ?? '';
      body.style.left = body.dataset[BODY_LEFT_KEY] ?? '';
      body.style.right = body.dataset[BODY_RIGHT_KEY] ?? '';
      body.style.width = body.dataset[BODY_WIDTH_KEY] ?? '';

      window.scrollTo(
        Number(body.dataset[BODY_SCROLL_X_KEY] ?? '0'),
        Number(body.dataset[BODY_SCROLL_Y_KEY] ?? '0'),
      );

      delete body.dataset[HTML_OVERFLOW_KEY];
      delete body.dataset[BODY_OVERFLOW_KEY];
      delete body.dataset[BODY_OVERSCROLL_KEY];
      delete body.dataset[BODY_POSITION_KEY];
      delete body.dataset[BODY_TOP_KEY];
      delete body.dataset[BODY_LEFT_KEY];
      delete body.dataset[BODY_RIGHT_KEY];
      delete body.dataset[BODY_WIDTH_KEY];
      delete body.dataset[BODY_SCROLL_X_KEY];
      delete body.dataset[BODY_SCROLL_Y_KEY];
    };
  }, [isLocked]);
}
