interface ScrollLockSnapshot {
  element: HTMLElement;
  overflow: string;
  overscrollBehavior: string;
  touchAction: string;
}

function canScroll(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return /(auto|scroll)/.test(style.overflow + style.overflowY);
}

export function lockSwipeScroll(root: HTMLElement) {
  const snapshots: ScrollLockSnapshot[] = [];
  const candidates = [root, ...root.querySelectorAll<HTMLElement>('*')];

  candidates.forEach((element) => {
    if (element !== root && !canScroll(element)) {
      return;
    }

    snapshots.push({
      element,
      overflow: element.style.overflow,
      overscrollBehavior: element.style.overscrollBehavior,
      touchAction: element.style.touchAction,
    });

    element.style.overflow = 'hidden';
    element.style.overscrollBehavior = 'none';

    if (element === root) {
      element.style.touchAction = 'none';
    }
  });

  return () => {
    snapshots.forEach(({ element, overflow, overscrollBehavior, touchAction }) => {
      element.style.overflow = overflow;
      element.style.overscrollBehavior = overscrollBehavior;
      element.style.touchAction = touchAction;
    });
  };
}
