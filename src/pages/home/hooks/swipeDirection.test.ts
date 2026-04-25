import { describe, expect, it } from 'vitest';
import { resolveSwipeDirection } from './swipeDirection';

describe('resolveSwipeDirection', () => {
  it('waits when movement is still below the lock threshold', () => {
    expect(resolveSwipeDirection(8, 9, 10)).toBeNull();
  });

  it('avoids locking to vertical on a shallow diagonal swipe too early', () => {
    expect(resolveSwipeDirection(14, 15, 10)).toBeNull();
  });

  it('locks horizontal once the drag clearly favors the x axis', () => {
    expect(resolveSwipeDirection(26, 18, 10)).toBe('horizontal');
  });

  it('locks vertical once the drag clearly favors the y axis', () => {
    expect(resolveSwipeDirection(18, 26, 10)).toBe('vertical');
  });

  it('eventually falls back to the dominant axis for larger diagonal drags', () => {
    expect(resolveSwipeDirection(28, 26, 10)).toBe('horizontal');
  });
});
