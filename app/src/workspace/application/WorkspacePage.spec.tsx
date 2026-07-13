import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AccountPageViewProps } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { MovementQuickActionComponentProps } from '../../transactions/application/MovementQuickActionComponent.contract';
import { WorkspacePage, type WorkspacePageRequired } from './WorkspacePage';

const taxonomyListCategories = vi.fn();
let movementDockNavigationProps: MovementQuickActionComponentProps | null = null;

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
  MovementDockNavigationComponent: (props: MovementQuickActionComponentProps) => {
    movementDockNavigationProps = props;
    return null;
  },
  TransactionEntryComponent: () => null,
}));

vi.mock('../../movements/index', () => ({
  MonthlyMovementsComponent: () => null,
}));

vi.mock('./ProfilePage', () => ({
  ProfilePage: () => null,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createRequiredCore() {
  return {
    taxonomyListCategories,
  } as unknown as WorkspacePageRequired['core'];
}

describe('WorkspacePage', () => {
  it('loads voice categories once when resolving them causes WorkspacePage to rerender', async () => {
    const loadCategories = deferred<{ items: Array<{ id: string; name: string; status: string; appliesTo: string }> }>();
    taxonomyListCategories.mockImplementation(() => loadCategories.promise);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={['/home']}>
        <WorkspacePage
          required={{
            core: createRequiredCore(),
            importFileReader: {} as WorkspacePageRequired['importFileReader'],
            voiceEntry: { enabled: true } as WorkspacePageRequired['voiceEntry'],
          }}
        />
      </MemoryRouter>,
    );

    expect(taxonomyListCategories).toHaveBeenCalledTimes(1);
    expect(taxonomyListCategories).toHaveBeenCalledWith({ includeArchived: false });

    await act(async () => {
      loadCategories.resolve({
        items: [
          {
            id: 'cat-food',
            name: 'Food',
            status: 'active',
            appliesTo: 'expense',
          },
        ],
      });
      await loadCategories.promise;
    });

    await waitFor(() => expect(taxonomyListCategories).toHaveBeenCalledTimes(1), { timeout: 250 });

    const errorMessages = consoleErrorSpy.mock.calls.flat().map((entry) => String(entry));
    const warnMessages = consoleWarnSpy.mock.calls.flat().map((entry) => String(entry));
    expect(errorMessages.some((message) => message.includes('Maximum update depth exceeded'))).toBe(false);
    expect(warnMessages.some((message) => message.includes('Maximum update depth exceeded'))).toBe(false);

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('does not load voice categories when voice entry is disabled', async () => {
    taxonomyListCategories.mockReset();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={['/home']}>
        <WorkspacePage
          required={{
            core: createRequiredCore(),
            importFileReader: {} as WorkspacePageRequired['importFileReader'],
            voiceEntry: { enabled: false } as WorkspacePageRequired['voiceEntry'],
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(taxonomyListCategories).not.toHaveBeenCalled(), { timeout: 250 });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('routes voice failures into a warning toast with a delegated action', async () => {
    taxonomyListCategories.mockResolvedValue({
      items: [
        {
          id: 'cat-food',
          name: 'Food',
          status: 'active',
          appliesTo: 'expense',
        },
      ],
    });
    movementDockNavigationProps = null;

    render(
      <MemoryRouter initialEntries={['/home']}>
        <WorkspacePage
          required={{
            core: createRequiredCore(),
            importFileReader: {} as WorkspacePageRequired['importFileReader'],
            voiceEntry: { enabled: true } as WorkspacePageRequired['voiceEntry'],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('workspace-toast')).toHaveTextContent('');
    expect(screen.getByTestId('workspace-toast')).toHaveAttribute('data-tone', 'success');
    expect(movementDockNavigationProps).not.toBeNull();
    const dockProps = movementDockNavigationProps as unknown as MovementQuickActionComponentProps;
    expect(dockProps.provided?.events?.onError).toBeDefined();

    const exportDiagnostics = vi.fn();

    await act(async () => {
      dockProps.provided?.events?.onError?.({
        message: 'Voice processing failed.',
        tone: 'warning',
        action: {
          label: 'Download ZIP',
          run: exportDiagnostics,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('workspace-toast')).toHaveTextContent('Voice processing failed.');
      expect(screen.getByTestId('workspace-toast')).toHaveAttribute('data-tone', 'warning');
      expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByRole('button', { name: 'Download ZIP' }).click();
    });

    expect(exportDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('routes successful voice drafts into an info toast with a delegated action', async () => {
    taxonomyListCategories.mockResolvedValue({
      items: [
        {
          id: 'cat-food',
          name: 'Food',
          status: 'active',
          appliesTo: 'expense',
        },
      ],
    });
    movementDockNavigationProps = null;

    render(
      <MemoryRouter initialEntries={['/home']}>
        <WorkspacePage
          required={{
            core: createRequiredCore(),
            importFileReader: {} as WorkspacePageRequired['importFileReader'],
            voiceEntry: { enabled: true } as WorkspacePageRequired['voiceEntry'],
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(movementDockNavigationProps).not.toBeNull());
    const dockProps = movementDockNavigationProps as unknown as MovementQuickActionComponentProps;

    await act(async () => {
      dockProps.provided?.events?.onNotice?.({
        message: 'Voice draft created. Review the interpreted values.',
        tone: 'info',
        action: {
          label: 'Download ZIP',
          run: vi.fn(),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('workspace-toast')).toHaveTextContent('Voice draft created. Review the interpreted values.');
      expect(screen.getByTestId('workspace-toast')).toHaveAttribute('data-tone', 'info');
      expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeInTheDocument();
    });
  });
});
