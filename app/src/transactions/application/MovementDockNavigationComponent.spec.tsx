import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovementDockNavigationComponentProps } from './MovementDockNavigationComponent.contract';
import { MovementDockNavigationComponent } from './MovementDockNavigationComponent';

const navigate = vi.fn();
const openDraft = vi.fn();
let draftOpen = false;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('./useMovementQuickActionModel', () => ({
  useMovementQuickActionModel: () => ({
    required: {
      state: {
        accounts: [
          { id: 'account-main', name: 'Main account', currency: 'EUR' },
          { id: 'account-secondary', name: 'Secondary account', currency: 'USD' },
        ],
        selectedAccountId: 'account-main',
        selectedAccountName: 'Main account',
        selectedMovementType: 'expense',
        draftOpen,
        accountSelectorOpen: false,
        typeSelectorOpen: false,
      },
      status: {
        loading: false,
        disabled: false,
      },
    },
    provided: {
      commands: {
        openDraft,
        closeDraft: vi.fn(),
        expandDraft: vi.fn(),
        toggleAccountSelector: vi.fn(),
        toggleTypeSelector: vi.fn(),
        closeAccountSelector: vi.fn(),
        closeTypeSelector: vi.fn(),
        selectAccount: vi.fn(),
        selectMovementType: vi.fn(),
      },
    },
  }),
}));

function makeProps(overrides: Partial<MovementDockNavigationComponentProps> = {}): MovementDockNavigationComponentProps {
  return {
    required: {
      context: {
        core: {
          ledgerListAccounts: vi.fn(),
          preferencesGet: vi.fn(),
        } as never,
      },
      config: {
        enabled: true,
        refreshSignal: false,
      },
      ...overrides.required,
    },
    provided: {
      events: {
        onCreateMovementRequested: vi.fn(),
        onError: vi.fn(),
        ...overrides.provided?.events,
      },
    },
  };
}

function renderSubject(route = '/home', propsOverrides: Partial<MovementDockNavigationComponentProps> = {}) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <MovementDockNavigationComponent {...makeProps(propsOverrides)} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  openDraft.mockReset();
  draftOpen = false;
});

describe('MovementDockNavigationComponent', () => {
  it('renders the restored five-item navbar in the original order', () => {
    renderSubject();

    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Home',
      'Analytics',
      'Add movement',
      'Movements',
      'Profile',
    ]);
    expect(screen.getByRole('button', { name: 'Add movement' })).toHaveClass('bottom-navigation-item--primary');
    expect(screen.queryByRole('button', { name: 'Record movement with voice' })).toBeNull();
  });

  it('keeps manual add on the existing quick-action command', () => {
    renderSubject();

    fireEvent.click(screen.getByRole('button', { name: 'Add movement' }));

    expect(openDraft).toHaveBeenCalledTimes(1);
  });

  it('marks Add movement as active while the draft is open', () => {
    draftOpen = true;
    renderSubject('/movements/search');

    expect(screen.getByRole('button', { name: 'Add movement' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Add movement' })).toHaveClass('bottom-navigation-item--active');
  });

  it.each([
    ['/home', 'Home'],
    ['/analytics/reports', 'Analytics'],
    ['/movements/archive', 'Movements'],
    ['/profile/settings', 'Profile'],
  ])('resolves the active navigation item from %s', (route, activeLabel) => {
    renderSubject(route);

    expect(screen.getByRole('button', { name: activeLabel })).toHaveAttribute('aria-current', 'page');
  });

  it('preserves the /movements/search route behavior', () => {
    renderSubject('/movements/search');

    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it.each([
    ['Home', '/home'],
    ['Analytics', '/analytics'],
    ['Movements', '/movements'],
    ['Profile', '/profile'],
  ])('navigates to %s through PAGE_PATH_BY_ID', (label, path) => {
    renderSubject();

    fireEvent.click(screen.getByRole('button', { name: label }));

    expect(navigate).toHaveBeenCalledWith(path);
  });
});
