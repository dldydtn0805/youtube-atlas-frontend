import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameIntroModal from './GameIntroModal';

describe('GameIntroModal', () => {
  it('walks through the first-visit guide before closing', () => {
    const onClose = vi.fn();

    render(<GameIntroModal isOpen onClose={onClose} />);

    expect(screen.getByRole('heading', { name: '랭킹 게임 안내' })).toBeInTheDocument();
    expect(screen.getByText('100,000P로 시작하기')).toBeInTheDocument();
    expect(screen.getByText(/같은 영상은 1개만 매수/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('순위와 거래 카운트로 가격 결정')).toBeInTheDocument();
    expect(screen.getByText(/순위 변동 자체에는 프리미엄이 없고/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('다음 순위 갱신 후 전량 매도')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('총자산으로 티어 경쟁')).toBeInTheDocument();
    expect(screen.getByText(/하이라이트 점수는 거래 기록과 칭호용/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('can jump steps and close with the permanent dismissal choice', () => {
    const onClose = vi.fn();

    render(<GameIntroModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '4단계: 총자산으로 티어 경쟁' }));
    expect(screen.getByText('총자산으로 티어 경쟁')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('다시 보지 않기'));
    fireEvent.click(screen.getByLabelText('랭킹 게임 안내 닫기'));

    expect(onClose).toHaveBeenCalledWith(true);
  });
});
