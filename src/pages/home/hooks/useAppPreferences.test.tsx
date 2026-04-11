import { act, renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAppPreferences from './useAppPreferences';

describe('useAppPreferences', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;
  const originalFullscreenElementDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');

  let fullscreenElement: Element | null = null;

  beforeEach(() => {
    window.localStorage.clear();
    fullscreenElement = null;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 768,
      writable: true,
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get() {
        return fullscreenElement;
      },
    });

    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
      const matches = maxWidthMatch ? window.innerWidth <= Number(maxWidthMatch[1]) : false;

      return {
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      } as MediaQueryList;
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });

    if (originalFullscreenElementDescriptor) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElementDescriptor);
    } else {
      Reflect.deleteProperty(document, 'fullscreenElement');
    }

    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('requests fullscreen even on mobile layout when cinematic mode is enabled', async () => {
    const playerSectionRef = createRef<HTMLElement>();
    const playerStageRef = createRef<HTMLDivElement>();
    const playerStage = document.createElement('div');
    const requestFullscreen = vi.fn().mockImplementation(async () => {
      fullscreenElement = playerStage;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    playerStage.requestFullscreen = requestFullscreen;
    playerStageRef.current = playerStage;
    playerSectionRef.current = document.createElement('section');

    const { result } = renderHook(() => useAppPreferences({ playerSectionRef, playerStageRef }));

    expect(result.current.isMobileLayout).toBe(true);

    await act(async () => {
      await result.current.handleToggleCinematicMode();
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.isCinematicModeActive).toBe(true);
    });
  });

  it('falls back to local cinematic state on mobile when fullscreen is unavailable', async () => {
    const playerSectionRef = createRef<HTMLElement>();
    const playerStageRef = createRef<HTMLDivElement>();
    const playerSection = document.createElement('section');
    const playerStage = document.createElement('div');

    playerSection.scrollIntoView = vi.fn();
    playerSectionRef.current = playerSection;
    playerStageRef.current = playerStage;

    const { result } = renderHook(() => useAppPreferences({ playerSectionRef, playerStageRef }));

    expect(result.current.isMobileLayout).toBe(true);

    await act(async () => {
      await result.current.handleToggleCinematicMode();
    });

    await waitFor(() => {
      expect(result.current.isCinematicModeActive).toBe(true);
    });

    expect(playerSection.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });
});
