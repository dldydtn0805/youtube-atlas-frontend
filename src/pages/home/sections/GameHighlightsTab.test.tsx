import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameHighlightsTab from './GameHighlightsTab';

describe('GameHighlightsTab', () => {
  it('hides the empty message while highlights are loading', () => {
    render(<GameHighlightsTab highlights={[]} isLoading onSelectHighlight={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('하이라이트가 없습니다.')).not.toBeInTheDocument();
  });
});
