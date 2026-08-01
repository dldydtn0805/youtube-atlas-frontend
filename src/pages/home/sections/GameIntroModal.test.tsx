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
    expect(screen.getByText('순위와 구매·판매 횟수로 가격 결정')).toBeInTheDocument();
    expect(screen.getByText(/구매한 횟수와 판매한 횟수의 차이로 가격이 움직입니다/)).toBeInTheDocument();
    expect(screen.getByText('구매 3회')).toBeInTheDocument();
    expect(screen.getByText('판매 1회')).toBeInTheDocument();
    expect(screen.getByText('가격 +2%')).toBeInTheDocument();
    expect(screen.queryByText(/프리미엄|순매수|순매도|거래 카운트|순위 앵커/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('다음 순위 갱신 후 전량 매도')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('총자산으로 티어 경쟁')).toBeInTheDocument();
    expect(screen.getByText(/티어 기준은 3개월 성장 폭에 맞춰 설정됩니다/)).toBeInTheDocument();
    expect(screen.queryByText(/하이라이트/)).not.toBeInTheDocument();

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
