import { useEffect, useRef, useState, type RefObject } from 'react';
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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(getInitialIsMobileLayout);
  const shouldScrollOnModeChangeRef = useRef(false);
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
      if (getFullscreenElement() !== playerStageRef.current) {
        setIsCinematicMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, [isMobileLayout, playerStageRef]);

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterModalOpen(false);
      }
    };

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterModalOpen]);

  useEffect(() => {
    if (!isCinematicModeActive || isMobileLayout || !shouldScrollOnModeChangeRef.current) {
      return;
    }

    shouldScrollOnModeChangeRef.current = false;

    window.setTimeout(() => {
      const playerSection = playerSectionRef.current;

      if (!playerSection) {
        return;
      }

      playerSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }, [isCinematicModeActive, isMobileLayout, playerSectionRef]);

  async function handleToggleCinematicMode() {
    if (isMobileLayout) {
      setIsCinematicMode((currentMode) => !currentMode);
      return;
    }

    if (isCinematicModeActive) {
      try {
        await exitElementFullscreen();
      } catch {
        setIsCinematicMode(false);
      }

      return;
    }

    shouldScrollOnModeChangeRef.current = true;
    setIsCinematicMode(true);

    window.setTimeout(() => {
      const playerStage = playerStageRef.current;

      if (!playerStage) {
        setIsCinematicMode(false);
        return;
      }

      void requestElementFullscreen(playerStage).catch(() => {
        setIsCinematicMode(false);
      });
    }, 0);
  }

  function handleToggleThemeMode() {
    setThemeMode((currentThemeMode) => (currentThemeMode === 'dark' ? 'light' : 'dark'));
  }

  function openFilterModal() {
    setIsFilterModalOpen(true);
  }

  function closeFilterModal() {
    setIsFilterModalOpen(false);
  }

  function handleCompleteFilterSelection() {
    setIsFilterModalOpen(false);
  }

  function updateRegionCode(regionCode: RegionCode) {
    setSelectedRegionCode(regionCode);
  }

  return {
    cinematicToggleLabel,
    closeFilterModal,
    handleCompleteFilterSelection,
    handleToggleCinematicMode,
    handleToggleThemeMode,
    isCinematicModeActive,
    isDarkMode,
    isFilterModalOpen,
    isMobileLayout,
    openFilterModal,
    selectedRegionCode,
    themeToggleDisplayLabel,
    themeToggleLabel,
    updateRegionCode,
  };
}

export default useAppPreferences;
