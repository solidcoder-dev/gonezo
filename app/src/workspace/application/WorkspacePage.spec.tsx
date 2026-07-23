import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AccountPageViewProps } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { MovementDockNavigationComponentProps } from '../../transactions/application/MovementDockNavigationComponent.contract';
import type { ExperimentalMovementDockNavigationComponentProps } from '../../transactions/application/ExperimentalMovementDockNavigationComponent.contract';
import type { ProfilePageProps } from './ProfilePage';
import type { CurrencyAccountsSheetComponentProps } from '../../account/application/CurrencyAccountsSheet/CurrencyAccountsSheetComponent';
import type { ManageAccountSheetComponentProps } from '../../account/application/ManageAccountSheet/ManageAccountSheetComponent';
import { WorkspacePage, type WorkspacePageRequired } from './WorkspacePage';

let movementDockNavigationProps: MovementDockNavigationComponentProps | null = null;
let experimentalMovementDockNavigationProps: ExperimentalMovementDockNavigationComponentProps | null = null;
let profilePageProps: ProfilePageProps | null = null;
let movementsSearchPageProps: { required: { refreshSignal: boolean }; provided: unknown } | null = null;

function makeExperimentalFeaturesPort(initialEnabled = false) {
  let enabled = initialEnabled;

  return {
    load: vi.fn(async () => ({
      voiceMovementEntryEnabled: enabled,
    })),
    setFeature: vi.fn(async (input: { enabled: boolean }) => {
      enabled = input.enabled;
    }),
    get enabled() {
      return enabled;
    },
  } as WorkspacePageRequired['experimentalFeatures'] & { enabled: boolean };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="workspace-path">{location.pathname}</div>;
}

vi.mock('../../account/ui/AccountPageView/AccountPageView', () => ({
  AccountPageView: ({ required, provided }: AccountPageViewProps) => (
    <div>
      <div data-testid="workspace-toast" data-tone={required.toast.tone}>
        {required.toast.message}
      </div>
      {required.toast.actionLabel ? (
        <button type="button" onClick={provided.toast.commands.runAction}>
          {required.toast.actionLabel}
        </button>
      ) : null}
      <LocationProbe />
      {required.sections.pageHeader}
      {required.sections.transactionEntry}
      {required.sections.accountSummary}
      {required.sections.netWorthSummary}
      {required.sections.transactionsImport}
    </div>
  ),
}));

vi.mock('../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent', () => ({
  TransactionsImportComponent: () => null,
}));

vi.mock('../../account/application/AccountsRail/AccountsRailComponent', () => ({
  AccountsRailComponent: () => null,
}));

vi.mock('../../transactions/index', () => ({
  MovementDockNavigationComponent: (props: MovementDockNavigationComponentProps) => {
    movementDockNavigationProps = props;
    return <nav data-testid="standard-navigation" />;
  },
  TransactionEntryComponent: () => null,
}));

vi.mock('../../transactions/application/ExperimentalMovementDockNavigationComponent', () => ({
  ExperimentalMovementDockNavigationComponent: (props: ExperimentalMovementDockNavigationComponentProps) => {
    experimentalMovementDockNavigationProps = props;
    return (
      <nav data-testid="experimental-navigation">
        <button
          type="button"
          onClick={() => props.provided?.events?.onBusyChanged?.(true)}
        >
          Busy
        </button>
      </nav>
    );
  },
}));

vi.mock('./ProfilePage', () => ({
  ProfilePage: (props: ProfilePageProps) => {
    profilePageProps = props;
    const location = useLocation();
    return (
      <div data-testid="profile-page">
        <div data-testid="profile-path">{location.pathname}</div>
        <button
          type="button"
          data-testid="toggle-experiment"
          onClick={() => props.provided?.events?.onSetVoiceMovementExperimentEnabled?.(!props.required.config.voiceMovementExperimentEnabled)}
        >
          Toggle
        </button>
      </div>
    );
  },
}));

vi.mock('../../movements/index', () => ({
  MonthlyMovementsComponent: () => null,
  MovementsSearchPage: (props: { required: { refreshSignal: boolean }; provided: unknown }) => {
    movementsSearchPageProps = props;
    return <div data-testid="movements-search-page" />;
  },
}));

vi.mock('./NetWorthSummaryComponent', () => ({
  NetWorthSummaryComponent: (props: { provided?: { events?: { onViewAccountsRequested?: (currency: string) => void } } }) => {
    return (
      <div data-testid="net-worth-summary">
        <button type="button" onClick={() => props.provided?.events?.onViewAccountsRequested?.('EUR')}>See all EUR</button>
        <button type="button" onClick={() => props.provided?.events?.onViewAccountsRequested?.('USD')}>See all USD</button>
      </div>
    );
  },
}));

vi.mock('../../account/application/CurrencyAccountsSheet/CurrencyAccountsSheetComponent', () => ({
  CurrencyAccountsSheetComponent: (props: CurrencyAccountsSheetComponentProps) => props.required.config.open ? (
    <div role="dialog" aria-label={`${props.required.config.currency} accounts`}>
      <button type="button" onClick={props.provided?.events?.onClose}>Close accounts</button>
      <button type="button" onClick={() => props.provided?.events?.onManageAccountRequested?.('eur-account')}>Manage Main EUR</button>
    </div>
  ) : null,
}));

vi.mock('../../account/application/ManageAccountSheet/ManageAccountSheetComponent', () => ({
  ManageAccountSheetComponent: (props: ManageAccountSheetComponentProps) => props.required.config.open ? (
    <div role="dialog" aria-label={`Manage ${props.required.context.accountId}`}>
      <input aria-label="Manage account name" defaultValue="Main EUR" />
      <button type="button">Save name</button>
      <button type="button">Archive account</button>
      <button type="button">Delete account</button>
      <button type="button" onClick={props.provided?.events?.onClose}>Close account management</button>
    </div>
  ) : null,
}));

vi.mock('../../analytics/application/AnalyticsPageComponent', () => ({
  AnalyticsPageComponent: () => null,
}));

vi.mock('./HomeRecentMovementsComponent', () => ({
  HomeRecentMovementsComponent: () => null,
}));

vi.mock('./useWorkspaceRefreshSignals', () => ({
  useWorkspaceRefreshSignals: () => ({
    signals: {
      accountHubRefreshSignal: false,
      accountSummaryRefreshSignal: false,
      analyticsRefreshSignal: false,
      expectedMovementsRefreshSignal: false,
      movementQuickActionRefreshSignal: false,
      netWorthRefreshSignal: false,
      recentTransactionsRefreshSignal: false,
    },
    refresh: () => undefined,
  }),
}));

vi.mock('./useWorkspaceImportCoordinator', () => ({
  useWorkspaceImportCoordinator: () => ({
    state: {
      importSheetOpen: false,
      importSubmitPhase: 'idle',
    },
    actions: {
      closeImportSheet: () => undefined,
      openImportSheet: () => undefined,
      requestMovementsBackup: async () => undefined,
      submitTransactionsImport: async () => ({ importedCount: 0, failedCount: 0 }),
    },
  }),
}));

vi.mock('./useMovementComposerCoordinator', () => ({
  useMovementComposerCoordinator: () => ({
    state: {
      movementAccountContext: undefined,
      movementEntryOpenSignal: 0,
      movementEntryType: undefined,
      transactionEntryAccountId: null,
      transactionEntryPrefill: undefined,
    },
    actions: {
      changeMovementComposerAccount: () => undefined,
      clearMovementEntryAccount: () => undefined,
      createMovementForAccount: () => undefined,
      createMovementForDraft: () => undefined,
      editExpectedMovement: () => undefined,
      postExpectedMovement: () => undefined,
      resetTransactionEntryPrefill: () => undefined,
    },
  }),
}));

vi.mock('./useWorkspaceAccountEvents', () => ({
  useWorkspaceAccountEvents: () => ({
    handleAccountDeleted: () => undefined,
    handleAccountMutated: () => undefined,
    handleAccountsCountChanged: () => undefined,
    handleProfileAccountMutated: () => undefined,
    handleSelectedAccountChanged: () => undefined,
  }),
}));

function createRequiredCore() {
  return {} as unknown as WorkspacePageRequired['core'];
}

function createRequiredVoiceEntry(enabled = true) {
  return {
    enabled,
    captureVoiceInput: {
      start: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
      discardRun: vi.fn(),
    } as never,
    transcribeVoiceInput: {
      transcribe: vi.fn(),
      cancel: vi.fn(),
    } as never,
    interpretMovementEntryDraft: {
      interpret: vi.fn(),
      cancel: vi.fn(),
    } as never,
    interpretationRunExporter: {
      exportRun: vi.fn(),
    } as never,
    microphonePermission: {
      getStatus: vi.fn(),
      request: vi.fn(),
      openSettings: vi.fn(),
    } as never,
    appLifecycle: undefined,
    categorySource: {
      taxonomyListCategories: vi.fn(async () => ({ items: [] })),
    } as never,
  } as WorkspacePageRequired['voiceEntry'];
}

function renderSubject(route: string, experimentalFeatures = makeExperimentalFeaturesPort(false), voiceEntry = createRequiredVoiceEntry()) {
  movementDockNavigationProps = null;
  experimentalMovementDockNavigationProps = null;
  profilePageProps = null;
  movementsSearchPageProps = null;

  return render(
    <MemoryRouter initialEntries={[route]}>
      <WorkspacePage
        required={{
          core: createRequiredCore(),
          importFileReader: {} as WorkspacePageRequired['importFileReader'],
          voiceEntry,
          experimentalFeatures,
        }}
      />
    </MemoryRouter>,
  );
}

describe('WorkspacePage', () => {
  it('opens and closes currency accounts without changing the Home route', async () => {
    renderSubject('/home');

    fireEvent.click(screen.getByRole('button', { name: 'See all EUR' }));
    expect(screen.getByRole('dialog', { name: 'EUR accounts' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-path')).toHaveTextContent('/home');

    fireEvent.click(screen.getByRole('button', { name: 'Close accounts' }));
    expect(screen.queryByRole('dialog', { name: 'EUR accounts' })).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-path')).toHaveTextContent('/home');
  });

  it('closes the currency account list and opens the selected account management sheet', () => {
    renderSubject('/home');

    fireEvent.click(screen.getByRole('button', { name: 'See all EUR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage Main EUR' }));

    expect(screen.queryByRole('dialog', { name: 'EUR accounts' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Manage eur-account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
    expect(screen.queryByText('Net balance')).not.toBeInTheDocument();
    expect(screen.getByTestId('workspace-path')).toHaveTextContent('/home');
  });

  it('renders the standard navbar when the experiment is disabled', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(false);

    renderSubject('/home', experimentalFeatures);

    await waitFor(() => expect(movementDockNavigationProps).not.toBeNull());
    expect(screen.getByTestId('standard-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('experimental-navigation')).toBeNull();
    expect(screen.queryByTestId('profile-page')).toBeNull();
    expect(experimentalFeatures.load).toHaveBeenCalledTimes(1);
  });

  it('renders the experimental navbar when the experiment is enabled and supported', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(true);
    const voiceEntry = createRequiredVoiceEntry(true);

    renderSubject('/home', experimentalFeatures, voiceEntry);

    await waitFor(() => expect(experimentalMovementDockNavigationProps).not.toBeNull());
    expect(screen.getByTestId('experimental-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('standard-navigation')).toBeNull();
    expect(voiceEntry.categorySource.taxonomyListCategories).not.toHaveBeenCalled();
  });

  it('renders the home page header with Gonezo and notifications', async () => {
    renderSubject('/home');

    expect(screen.getByRole('heading', { name: 'Gonezo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  });

  it('renders the analytics page header with Analytics and notifications', async () => {
    renderSubject('/analytics');

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  });

  it('renders the movements page header with search before notifications and navigates to global search', async () => {
    renderSubject('/movements');

    expect(screen.getByRole('heading', { name: 'Movements' })).toBeInTheDocument();
    expect(screen.getByTestId('standard-navigation')).toBeInTheDocument();
    const searchLink = screen.getByRole('link', { name: 'Search movements' });
    const notificationsButton = screen.getByRole('button', { name: 'Open notifications' });
    expect(searchLink.compareDocumentPosition(notificationsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(searchLink);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-path')).toHaveTextContent('/movements/search');
    });
  });

  it('renders Search inside WorkspacePage without the workspace header or bottom navigation', () => {
    renderSubject('/movements/search?source=expected&type=income');

    expect(screen.getByTestId('movements-search-page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Movements' })).toBeNull();
    expect(screen.queryByTestId('standard-navigation')).toBeNull();
    expect(screen.getByTestId('workspace-path')).toHaveTextContent('/movements/search');
    expect(movementsSearchPageProps).not.toBeNull();
  });

  it('renders the profile page header with Profile and notifications', async () => {
    renderSubject('/profile');

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  });

  it('renders the standard navbar when the experiment is enabled but the device is unavailable', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(true);
    const voiceEntry = createRequiredVoiceEntry(false);

    renderSubject('/home', experimentalFeatures, voiceEntry);

    await waitFor(() => expect(movementDockNavigationProps).not.toBeNull());
    expect(screen.getByTestId('standard-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('experimental-navigation')).toBeNull();
  });

  it('switches navbar variants immediately when the profile toggle changes and keeps the route', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(false);

    renderSubject('/profile', experimentalFeatures);

    await waitFor(() => expect(profilePageProps).not.toBeNull());
    expect(screen.getByTestId('standard-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('profile-path')).toHaveTextContent('/profile');

    act(() => {
      screen.getByTestId('toggle-experiment').click();
    });

    await waitFor(() => expect(screen.getByTestId('experimental-navigation')).toBeInTheDocument());
    expect(screen.getByTestId('profile-path')).toHaveTextContent('/profile');
    expect(experimentalFeatures.enabled).toBe(true);
  });

  it('persists the experiment preference across remounts', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(false);

    const firstRender = renderSubject('/home', experimentalFeatures);
    await waitFor(() => expect(screen.getByTestId('standard-navigation')).toBeInTheDocument());
    firstRender.unmount();

    experimentalFeatures.setFeature({ feature: 'voiceMovementEntry', enabled: true });

    renderSubject('/home', experimentalFeatures);
    await waitFor(() => expect(screen.getByTestId('experimental-navigation')).toBeInTheDocument());
  });

  it('renders only one navigation variant at a time', async () => {
    const experimentalFeatures = makeExperimentalFeaturesPort(true);

    renderSubject('/home', experimentalFeatures);

    await waitFor(() => expect(screen.getByTestId('experimental-navigation')).toBeInTheDocument());
    expect(screen.queryByTestId('standard-navigation')).toBeNull();
    expect(screen.queryAllByRole('navigation')).toHaveLength(1);
  });

  it('keeps navigation available while the preference is loading', async () => {
    let resolveLoad: ((value: { voiceMovementEntryEnabled: boolean }) => void) | undefined;
    const loadDeferred = new Promise<{ voiceMovementEntryEnabled: boolean }>((resolve) => {
      resolveLoad = resolve;
    });
    const experimentalFeatures = {
      load: vi.fn(() => loadDeferred),
      setFeature: vi.fn(async () => undefined),
      enabled: false,
    } as WorkspacePageRequired['experimentalFeatures'] & { enabled: boolean };

    renderSubject('/home', experimentalFeatures);

    expect(screen.getByTestId('standard-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('experimental-navigation')).toBeNull();
    resolveLoad?.({ voiceMovementEntryEnabled: true });
    await waitFor(() => expect(screen.getByTestId('experimental-navigation')).toBeInTheDocument());
  });
});
