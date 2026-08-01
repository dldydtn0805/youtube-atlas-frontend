import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('../pages/home/HomePage', () => ({
  default: () => <main>홈 페이지</main>,
}));

vi.mock('../pages/admin/AdminPage', () => ({
  default: () => <main>관리자 페이지</main>,
}));

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  it('renders the home page at the root route', async () => {
    renderAt('/');

    expect(await screen.findByText('홈 페이지')).toBeInTheDocument();
  });

  it('renders the admin page for admin routes', async () => {
    renderAt('/admin/users');

    expect(await screen.findByText('관리자 페이지')).toBeInTheDocument();
  });

  it('redirects unknown routes to the home page', async () => {
    renderAt('/없는-페이지');

    expect(await screen.findByText('홈 페이지')).toBeInTheDocument();
  });
});
