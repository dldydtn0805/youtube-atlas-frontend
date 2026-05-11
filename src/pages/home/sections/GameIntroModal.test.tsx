import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameIntroModal from './GameIntroModal';

describe('GameIntroModal', () => {
  it('walks through the first-visit guide before closing', () => {
    const onClose = vi.fn();

    render(<GameIntroModal isOpen onClose={onClose} />);

    expect(screen.getByRole('heading', { name: '랭킹 게임 안내' })).toBeInTheDocument();
    expect(screen.getByText('사고 팔아 포인트 벌기')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('하이라이트로 티어 올리기')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('기록과 경쟁')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('can jump steps and close with the permanent dismissal choice', () => {
    const onClose = vi.fn();

    render(<GameIntroModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '3단계: 기록과 경쟁' }));
    expect(screen.getByText('기록과 경쟁')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('다시 보지 않기'));
    fireEvent.click(screen.getByLabelText('랭킹 게임 안내 닫기'));

    expect(onClose).toHaveBeenCalledWith(true);
  });
});
