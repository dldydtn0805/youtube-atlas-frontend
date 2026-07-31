import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenView(): never {
  throw new Error('render failed');
}

describe('AppErrorBoundary', () => {
  it('shows a recoverable error instead of leaving a blank page', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('앱을 불러오지 못했습니다.');
    expect(screen.getByText('render failed')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
