import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AccountPageViewProps } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { MovementDockNavigationComponentProps } from '../../transactions/application/MovementDockNavigationComponent.contract';
import type { ExperimentalMovementDockNavigationComponentProps } from '../../transactions/application/ExperimentalMovementDockNavigationComponent.contract';
import type { ProfilePageProps } from './ProfilePage';
import { WorkspacePage, type WorkspacePageRequired } from './WorkspacePage';

let movementDockNavigationProps: MovementDockNavigationComponentProps | null = null;
let experimentalMovementDockNavigationProps: ExperimentalMovementDockNavigationComponentProps | null = null;
let profilePageProps: ProfilePageProps | null = null;

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
}));

vi.mock('./NetWorthSummaryComponent', () => ({
  NetWorthSummaryComponent: () => null,
}));

vi.mock('../../movements/application/ExpectedMovementsCardComponent', () => ({
  ExpectedMovementsCardComponent: () => null,
}));

vi.mock('../../analytics/application/AnalyticsPageComponent', () => ({
  AnalyticsPageComponent: () => null,
}));

vi.mock('./HomeRecentMovementsComponent', () => ({
  HomeRecentMovementsComponent: () => null,
}));

vi.mock('../ui/HomeHeader/HomeHeaderView', () => ({
  HomeHeaderView: () => null,
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

  it('does not flash the wrong navbar while the preference is loading', async () => {
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

    expect(screen.queryByTestId('standard-navigation')).toBeNull();
    expect(screen.queryByTestId('experimental-navigation')).toBeNull();
    resolveLoad?.({ voiceMovementEntryEnabled: true });
  });
});
