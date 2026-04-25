interface ScrollLockSnapshot {
  element: HTMLElement;
  overflow: string;
  overscrollBehavior: string;
  touchAction: string;
}

export function lockSwipeScroll(targets: readonly HTMLElement[]) {
  const snapshots: ScrollLockSnapshot[] = [];

  targets.forEach((element, index) => {
    if (!(element instanceof HTMLElement)) {
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

    if (index === 0) {
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
