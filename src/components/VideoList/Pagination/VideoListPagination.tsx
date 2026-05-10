import { useEffect, useRef, useState } from 'react';
import './VideoListPagination.css';

interface VideoListPaginationProps {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentPage: number;
  label: string;
  onNext: () => void;
  onOpenPageSelect?: () => void;
  onPageChange: (pageIndex: number) => void;
  onPrevious: () => void;
  shouldPreparePages?: boolean;
  totalPages: number;
}

export default function VideoListPagination({
  canGoNext,
  canGoPrevious,
  currentPage,
  label,
  onNext,
  onOpenPageSelect,
  onPageChange,
  onPrevious,
  shouldPreparePages = false,
  totalPages,
}: VideoListPaginationProps) {
  const [isPageMenuOpen, setIsPageMenuOpen] = useState(false);
  const pagePickerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isPageMenuOpen || typeof document === 'undefined') {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (pagePickerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsPageMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isPageMenuOpen]);

  const handleTogglePageMenu = () => {
    if (shouldPreparePages) {
      setIsPageMenuOpen(false);
      onOpenPageSelect?.();
      return;
    }

    setIsPageMenuOpen((currentValue) => !currentValue);
  };

  const handlePageChange = (page: number) => {
    onPageChange(page - 1);
    setIsPageMenuOpen(false);
  };

  return (
    <div className="video-list__pagination" aria-label={label} role="navigation">
      <button
        aria-label="이전"
        className="video-list__page-button"
        disabled={!canGoPrevious}
        onClick={onPrevious}
        title="이전"
        type="button"
      >
        <span className="video-list__page-icon" aria-hidden="true">‹</span>
      </button>
      <span className="video-list__page-status" ref={pagePickerRef}>
        <button
          aria-expanded={isPageMenuOpen}
          aria-haspopup="listbox"
          aria-label={`현재 페이지 ${currentPage}`}
          className="video-list__page-select"
          onClick={handleTogglePageMenu}
          type="button"
        >
          <span>{currentPage}</span>
          <span className="video-list__page-select-chevron" aria-hidden="true">▾</span>
        </button>
        {isPageMenuOpen ? (
          <div className="video-list__page-menu" role="listbox" aria-label="페이지 선택">
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;

              return (
                <button
                  aria-selected={page === currentPage}
                  className="video-list__page-option"
                  key={page}
                  onClick={() => handlePageChange(page)}
                  role="option"
                  type="button"
                >
                  {page}
                </button>
              );
            })}
          </div>
        ) : null}
        <span className="video-list__page-divider" aria-hidden="true">/</span>
        <span className="video-list__page-total">{totalPages}</span>
      </span>
      <button
        aria-label="다음"
        className="video-list__page-button"
        disabled={!canGoNext}
        onClick={onNext}
        title="다음"
        type="button"
      >
        <span className="video-list__page-icon" aria-hidden="true">›</span>
      </button>
    </div>
  );
}
