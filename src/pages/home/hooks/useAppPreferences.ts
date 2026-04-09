import { useEffect, useState, type RefObject } from 'react';
import {
  MOBILE_BREAKPOINT,
  exitElementFullscreen,
  getFullscreenElement,
  getInitialCinematicMode,
  getInitialIsMobileLayout,
  getInitialRegionCode,
  getInitialThemeMode,
  persistCinematicMode,
  persistRegionCode,
  persistThemeMode,
  requestElementFullscreen,
  type RegionCode,
  type ThemeMode,
} from '../utils';

interface UseAppPreferencesOptions {
  playerSectionRef: RefObject<HTMLElement | null>;
  playerStageRef: RefObject<HTMLDivElement | null>;
}

function useAppPreferences({ playerSectionRef, playerStageRef }: UseAppPreferencesOptions) {
  const [selectedRegionCode, setSelectedRegionCode] = useState(getInitialRegionCode);
  const [isCinematicMode, setIsCinematicMode] = useState(getInitialCinematicMode);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
  const [isMobileLayout, setIsMobileLayout] = useState(getInitialIsMobileLayout);
  const isCinematicModeActive = isCinematicMode;
  const isDarkMode = themeMode === 'dark';
  const cinematicToggleLabel = isCinematicModeActive ? '기본 보기' : '시네마틱 모드';
  const themeToggleLabel = isDarkMode ? '라이트 모드' : '다크 모드';
  const themeToggleDisplayLabel = isDarkMode ? '☀' : '☾';

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileLayout(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    legacyMediaQuery.addListener(handleChange);

    return () => {
      legacyMediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    persistRegionCode(selectedRegionCode);
  }, [selectedRegionCode]);

  useEffect(() => {
    persistCinematicMode(isCinematicMode);
  }, [isCinematicMode]);

  useEffect(() => {
    persistThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (isMobileLayout) {
      return;
    }

    const handleFullscreenChange = () => {
      setIsCinematicMode(getFullscreenElement() === playerStageRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, [isMobileLayout, playerStageRef]);

  async function handleToggleCinematicMode() {
    if (isMobileLayout) {
      setIsCinematicMode((currentMode) => !currentMode);
      return;
    }

    if (isCinematicModeActive) {
      try {
        const didExitFullscreen = await exitElementFullscreen();

        if (!didExitFullscreen || getFullscreenElement() !== null) {
          setIsCinematicMode(false);
        }
      } catch {
        setIsCinematicMode(false);
      }

      return;
    }

    const playerStage = playerStageRef.current;

    if (!playerStage) {
      return;
    }

    try {
      const didEnterFullscreen = await requestElementFullscreen(playerStage);

      if (!didEnterFullscreen || getFullscreenElement() !== playerStage) {
        setIsCinematicMode(true);
        playerSectionRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });
      }
    } catch {
      setIsCinematicMode(true);
      playerSectionRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    }
  }

  function handleToggleThemeMode() {
    setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'));
  }

  function updateRegionCode(regionCode: RegionCode) {
    setSelectedRegionCode(regionCode);
  }

  return {
    cinematicToggleLabel,
    handleToggleCinematicMode,
    handleToggleThemeMode,
    isCinematicModeActive,
    isDarkMode,
    isMobileLayout,
    selectedRegionCode,
    themeToggleDisplayLabel,
    themeToggleLabel,
    updateRegionCode,
  };
}

export default useAppPreferences;
