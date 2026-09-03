import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackNavigationBridge } from './BackNavigationBridge';

const { capacitorBackListeners, exitApp } = vi.hoisted(() => ({
  capacitorBackListeners: [] as Array<() => void>,
  exitApp: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, listener: () => void) => {
      capacitorBackListeners.push(listener);
      return { remove: vi.fn() };
    }),
    exitApp,
  },
}));

function NavigationFixture({ target = '/movements/search' }: { target?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button type="button" onClick={() => { void navigate(target); }}>Open search</button>
      <output>{location.pathname}{location.search}</output>
    </>
  );
}

describe('BackNavigationBridge', () => {
  beforeEach(() => {
    capacitorBackListeners.length = 0;
    exitApp.mockClear();
  });

  it.each(['/home', '/movements'])('returns to the actual previous route from %s', async (origin) => {
    render(
      <MemoryRouter initialEntries={[origin]}>
        <BackNavigationBridge>
          <Routes>
            <Route path="*" element={<NavigationFixture />} />
          </Routes>
        </BackNavigationBridge>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    expect(screen.getByText('/movements/search')).toBeInTheDocument();

    await waitFor(() => expect(capacitorBackListeners).toHaveLength(1));
    capacitorBackListeners[0]?.();

    await waitFor(() => expect(screen.getByText(origin)).toBeInTheDocument());
    expect(exitApp).not.toHaveBeenCalled();
  });

  it('preserves the exact previous query string', async () => {
    render(
      <MemoryRouter initialEntries={['/home?from=dashboard']}>
        <BackNavigationBridge>
          <Routes>
            <Route path="*" element={<NavigationFixture target="/movements/search?source=expected&type=expense" />} />
          </Routes>
        </BackNavigationBridge>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
    await waitFor(() => expect(capacitorBackListeners).toHaveLength(1));
    capacitorBackListeners[0]?.();

    await waitFor(() => expect(screen.getByText('/home?from=dashboard')).toBeInTheDocument());
  });
});
