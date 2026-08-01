import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('../pages/home/HomePage', () => ({
  default: ({
    selectedChartView,
    selectedRegionCode,
  }: {
    selectedChartView: string;
    selectedRegionCode: string;
  }) => <main>{`${selectedRegionCode}:${selectedChartView}`}</main>,
}));

vi.mock('../pages/admin/AdminPage', () => ({
  default: () => <main>관리자 페이지</main>,
}));

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  beforeEach(() => {
    window.localStorage.setItem('youtube-atlas-region-code', 'US');
    window.sessionStorage.clear();
  });

  it('redirects the root route to the stored nation TOP path', async () => {
    renderAt('/');

    expect(await screen.findByText('US:popular')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/us/top');
  });

  it('renders nation and category route params as home state', async () => {
    renderAt('/jp/music');

    expect(await screen.findByText('JP:music')).toBeInTheDocument();
  });

  it('normalizes nation and category path casing', async () => {
    renderAt('/JP/MUSIC');

    expect(await screen.findByText('JP:music')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/jp/music');
  });

  it('renders the admin page for admin routes', async () => {
    renderAt('/admin/users');

    expect(await screen.findByText('관리자 페이지')).toBeInTheDocument();
  });

  it('redirects unknown routes to the stored nation TOP path', async () => {
    renderAt('/없는-페이지');

    expect(await screen.findByText('US:popular')).toBeInTheDocument();
  });

  it('restores the liked route after OAuth returns to the root', async () => {
    window.sessionStorage.setItem(
      'youtube-atlas-pending-liked-videos-view',
      'true',
    );

    renderAt('/');

    expect(await screen.findByText('US:liked')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/us/liked');
  });

  it('redirects unsupported nation and category params', async () => {
    renderAt('/de/gaming');

    expect(await screen.findByText('US:popular')).toBeInTheDocument();
  });
});
