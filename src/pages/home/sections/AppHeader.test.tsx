import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AppHeader from './AppHeader';

vi.mock('../../../components/GoogleLoginButton/GoogleLoginButton', () => ({
  default: () => null,
}));

describe('AppHeader', () => {
  it('shows The Rank Game as the single home brand', () => {
    render(
      <MemoryRouter>
        <AppHeader
          authStatus="anonymous"
          isDarkMode={false}
          isLoggingOut={false}
          onLogout={() => undefined}
          onToggleThemeMode={() => undefined}
          themeToggleLabel="다크 모드"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'The Rank Game' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The Rank Game 메인 페이지로 이동' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('YouTube Atlas')).not.toBeInTheDocument();
  });
});
