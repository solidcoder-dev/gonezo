import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AccountPageViewProps } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { ExperimentalMovementDockNavigationComponentProps } from '../../transactions/application/ExperimentalMovementDockNavigationComponent.contract';
import type { TransactionEntryComponentProps } from '../../transactions/application/TransactionEntryComponent.contract';
import { WorkspacePage, type WorkspacePageRequired } from './WorkspacePage';

const experimentalNavigationProps: { current: ExperimentalMovementDockNavigationComponentProps | null } = {
  current: null,
};

vi.mock('../../account/ui/AccountPageView/AccountPageView', () => ({
  AccountPageView: ({ required }: AccountPageViewProps) => (
    <div>
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
  MovementDockNavigationComponent: () => null,
  TransactionEntryComponent: ({ required }: TransactionEntryComponentProps) => {
    if (!required.context.accountId) {
      return null;
    }

    return (
      <div
        data-testid="movement-composer"
        data-account-id={required.context.accountId}
        data-open-signal={required.config.openSignal}
        data-initial-mode={required.config.initialMode}
      >
        {JSON.stringify(required.config.prefillRequest)}
      </div>
    );
  },
}));

vi.mock('../../transactions/application/ExperimentalMovementDockNavigationComponent', () => ({
  ExperimentalMovementDockNavigationComponent: (props: ExperimentalMovementDockNavigationComponentProps) => {
    experimentalNavigationProps.current = props;
    return (
      <button
        type="button"
        data-testid="emit-voice-draft"
        onClick={() =>
          props.provided?.events?.onMovementEntryDraftReady?.({
            account: {
              id: 'account-main',
              name: 'Main account',
              currency: 'EUR',
            },
            draft: {
              type: 'expense',
              amount: '34.80',
              occurredOn: '2026-07-14',
              note: 'Gasté 34,80 euros ayer en Comida',
              categoryId: 'cat-food',
              issues: [],
            },
          })
        }
      >
        Emit voice draft
      </button>
    );
  },
}));

vi.mock('./ProfilePage', () => ({
  ProfilePage: () => null,
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

function createRequiredVoiceEntry() {
  return {
    enabled: true,
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

describe('WorkspacePage voice entry integration', () => {
  it('opens the existing composer from the experimental dock draft without recording a movement automatically', async () => {
    const experimentalFeatures = {
      load: vi.fn(async () => ({ voiceMovementEntryEnabled: true })),
      setFeature: vi.fn(async () => undefined),
    } as WorkspacePageRequired['experimentalFeatures'];

    render(
      <MemoryRouter initialEntries={['/home']}>
        <WorkspacePage
          required={{
            core: createRequiredCore(),
            importFileReader: {} as WorkspacePageRequired['importFileReader'],
            voiceEntry: createRequiredVoiceEntry(),
            experimentalFeatures,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('movement-composer')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('emit-voice-draft')).toBeInTheDocument());

    await act(async () => {
      screen.getByTestId('emit-voice-draft').click();
    });

    await waitFor(() => expect(screen.getByTestId('movement-composer')).toBeInTheDocument());

    const composer = screen.getByTestId('movement-composer');
    expect(composer).toHaveAttribute('data-account-id', 'account-main');
    expect(composer).toHaveAttribute('data-open-signal', '1');
    expect(composer).toHaveAttribute('data-initial-mode', 'expense');

    const prefillRequest = JSON.parse(composer.textContent ?? '{}');
    expect(prefillRequest).toEqual({
      requestId: expect.any(Number),
      mode: 'expense',
      amount: '34.80',
      date: '2026-07-14',
      note: 'Gasté 34,80 euros ayer en Comida',
      categoryId: 'cat-food',
    });
  });
});
