import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { TransactionsImportFileReaderPort } from '../../imports/application/transactionsImportFileReader.port';
import { MovementDockNavigationComponent, TransactionEntryComponent } from '../../transactions/index';
import { ExperimentalMovementDockNavigationComponent } from '../../transactions/application/ExperimentalMovementDockNavigationComponent';
import { MonthlyMovementsComponent } from '../../movements/index';
import { MovementsSearchPage } from '../../movements/index';
import type { MovementsSearchPagePort } from '../../movements/application/movementsSearch.port';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import { ApplicationBackupRestoreComponent } from '../../imports/application/ApplicationBackupRestoreComponent';
import type { ApplicationBackupPort, MovementsBackupPort } from '../../imports/application/imports.port';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { MovementReuseSuggestionsPort, MovementReuseTemplatePort } from '../../movements/application/movementReuseSuggestions.port';
import { ProfilePage } from './ProfilePage';
import { NetWorthSummaryComponent } from './NetWorthSummaryComponent';
import { CurrencyAccountsSheetComponent } from '../../account/application/CurrencyAccountsSheet/CurrencyAccountsSheetComponent';
import { ManageAccountSheetComponent } from '../../account/application/ManageAccountSheet/ManageAccountSheetComponent';
import { PendingExpectedOverviewComponent, type PendingExpectedOverviewPort } from './PendingExpectedOverviewComponent';
import { AnalyticsPageComponent } from '../../analytics/application/AnalyticsPageComponent';
import { HomeRecentMovementsComponent, type HomeRecentMovementsPort } from './HomeRecentMovementsComponent';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader/WorkspacePageHeader';
import { useWorkspaceRefreshSignals } from './useWorkspaceRefreshSignals';
import { useWorkspaceImportCoordinator } from './useWorkspaceImportCoordinator';
import { useWorkspaceToast } from './useWorkspaceToast';
import { useMovementComposerCoordinator } from './useMovementComposerCoordinator';
import { resolveWorkspaceRoutePage } from './workspaceNavigation';
import { useWorkspaceAccountEvents } from './useWorkspaceAccountEvents';
import type { MovementVoiceEntryContext } from '../../transactions/application/MovementVoiceEntry/movementVoiceEntryContext';
import { useExperimentalFeaturesModel } from '../../experiments/application/useExperimentalFeaturesModel';
import type { ExperimentalFeaturesPort } from '../../experiments/application/experimentalFeatures.port';

export type WorkspacePageRequired = {
  core: WorkspacePagePort;
  importFileReader: TransactionsImportFileReaderPort;
  voiceEntry: MovementVoiceEntryContext;
  experimentalFeatures: ExperimentalFeaturesPort;
};

export type WorkspacePagePort = AccountWorkspacePort & MovementsBackupPort & ApplicationBackupPort & AnalyticsPort & HomeRecentMovementsPort & PendingExpectedOverviewPort & MovementsSearchPagePort & MovementReuseSuggestionsPort & MovementReuseTemplatePort;

type WorkspacePageProps = {
  required: WorkspacePageRequired;
};

type MovementEntryNavigationState = {
  returnTo: string;
};

function readMovementEntryReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) {
    return null;
  }
  const returnTo = state.returnTo;
  return typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo !== '/movements/new'
    ? returnTo
    : null;
}

export function WorkspacePage({ required: pageRequired }: WorkspacePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [screenLoadPhase, setScreenLoadPhase] = useState<LoadPhase>('loading');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountsSheetCurrency, setAccountsSheetCurrency] = useState<string | null>(null);
  const [managedAccountId, setManagedAccountId] = useState<string | null>(null);
  const [accountsCount, setAccountsCount] = useState(0);

  const workspaceToast = useWorkspaceToast();
  const { clearToast, runToastAction, showError, showInfo, showToast, showWarning } = workspaceToast.actions;
  const experimentalFeatures = useExperimentalFeaturesModel({
    port: pageRequired.experimentalFeatures,
    events: {
      onError: showError,
    },
  });
  const workspaceRefresh = useWorkspaceRefreshSignals();
  const { refresh } = workspaceRefresh;
  const {
    accountHubRefreshSignal,
    analyticsRefreshSignal,
    expectedMovementsRefreshSignal,
    movementQuickActionRefreshSignal,
    netWorthRefreshSignal,
    recentTransactionsRefreshSignal,
  } = workspaceRefresh.signals;
  const importCoordinator = useWorkspaceImportCoordinator({
    core: pageRequired.core,
    movementsImport: pageRequired.core,
    applicationBackup: pageRequired.core,
    fileReader: pageRequired.importFileReader,
    refresh,
    showToast,
  });
  const { importSheetOpen, importSubmitPhase, restoreSheetOpen } = importCoordinator.state;
  const {
    closeImportSheet,
    closeRestoreSheet,
    openImportSheet,
    openRestoreSheet,
    requestApplicationBackup,
    requestApplicationBackupRestore,
    submitTransactionsImport,
  } = importCoordinator.actions;
  const movementComposer = useMovementComposerCoordinator({ selectedAccountId });
  const {
    movementAccountContext,
    movementEntryOpenSignal,
    movementEntryType,
    transactionEntryAccountId,
    transactionEntryPrefill,
  } = movementComposer.state;
  const {
    changeMovementComposerAccount,
    clearMovementEntryAccount,
    createMovementForAccount,
    createMovementForDraft,
    editExpectedMovement,
    postExpectedMovement,
    duplicateMovement,
    resetTransactionEntryPrefill,
  } = movementComposer.actions;
  const currentPage = resolveWorkspaceRoutePage(location.pathname);
  const [voiceWorkflowBusy, setVoiceWorkflowBusy] = useState(false);
  const {
    handleAccountDeleted,
    handleAccountMutated,
    handleProfileAccountMutated,
    handleSelectedAccountChanged,
  } = useWorkspaceAccountEvents({
    selectedAccountId,
    setAccountsCount,
    setSelectedAccountId,
    refresh,
  });
  const openNotifications = () => undefined;

  function navigateToMovementEntry() {
    const state: MovementEntryNavigationState = {
      returnTo: `${location.pathname}${location.search}`,
    };
    void navigate('/movements/new', { state });
  }

  function handleCreateMovement(movement: Parameters<typeof createMovementForAccount>[0]) {
    createMovementForAccount(movement);
    navigateToMovementEntry();
  }

  function handleCreateMovementFromDraft(movement: Parameters<typeof createMovementForDraft>[0]) {
    createMovementForDraft(movement);
    navigateToMovementEntry();
  }

  function handleDuplicateMovement(movement: Parameters<typeof duplicateMovement>[0]) {
    duplicateMovement(movement);
    navigateToMovementEntry();
  }

  function handleEditExpectedMovement(...args: Parameters<typeof editExpectedMovement>) {
    editExpectedMovement(...args);
    navigateToMovementEntry();
  }

  function handlePostExpectedMovement(...args: Parameters<typeof postExpectedMovement>) {
    postExpectedMovement(...args);
    navigateToMovementEntry();
  }

  function closeMovementEntry() {
    clearMovementEntryAccount();
    const returnTo = readMovementEntryReturnTo(location.state);
    if (returnTo) {
      void navigate(returnTo);
      return;
    }
    void navigate('/movements');
  }

  useEffect(() => {
    if (currentPage === 'movementNew' && !transactionEntryAccountId) {
      void navigate('/movements');
    }
  }, [currentPage, navigate, screenLoadPhase, transactionEntryAccountId]);

  const transactionEntry = currentPage === 'movementNew' && transactionEntryAccountId
    ? (
        <TransactionEntryComponent
          required={{
            context: {
              accountId: transactionEntryAccountId,
              core: pageRequired.core,
            },
            config: {
              enabled: Boolean(transactionEntryAccountId),
              prefillRequest: transactionEntryPrefill,
              openSignal: movementEntryOpenSignal || (currentPage === 'movementNew' ? 1 : undefined),
              initialMode: movementEntryType,
              movementAccountContext,
            },
          }}
          provided={{
            events: {
              onRecorded: () => {
                refresh('recentTransactions', 'accountSummary', 'netWorth', 'expectedMovements', 'analytics');
                resetTransactionEntryPrefill();
                clearMovementEntryAccount();
              },
              onClosed: closeMovementEntry,
              onAccountChanged: changeMovementComposerAccount,
            },
          }}
        />
      )
    : null;

  const voiceMovementExperimentEnabled = experimentalFeatures.state.features.voiceMovementEntryEnabled;
  const voiceMovementExperimentActive = !experimentalFeatures.state.loading
    && voiceMovementExperimentEnabled
    && pageRequired.voiceEntry.enabled;
  const dockNavigation = voiceMovementExperimentActive
      ? (
          <ExperimentalMovementDockNavigationComponent
            required={{
              context: {
                core: pageRequired.core,
                voiceEntry: pageRequired.voiceEntry,
              },
              config: {
                enabled: voiceMovementExperimentActive,
                refreshSignal: movementQuickActionRefreshSignal,
              },
            }}
            provided={{
              events: {
                onCreateMovementRequested: handleCreateMovement,
                onMovementEntryDraftReady: ({ account, draft }) => {
                  handleCreateMovementFromDraft({ account, draft });
                },
                onNotice: (notice) => {
                  if (notice.tone === 'info') {
                    showInfo(notice.message, notice.action);
                    return;
                  }

                  if (notice.tone === 'warning') {
                    showWarning(notice.message, notice.action);
                    return;
                  }

                  if (notice.tone === 'error') {
                    showError({ message: notice.message });
                    return;
                  }

                  showToast(notice.message);
                },
                onError: (notice) => {
                  if (notice.tone === 'warning') {
                    showWarning(notice.message, notice.action);
                    return;
                  }

                  showError({ message: notice.message });
                },
                onBusyChanged: setVoiceWorkflowBusy,
              },
            }}
          />
        )
      : (
          <MovementDockNavigationComponent
            required={{
              context: {
                core: pageRequired.core,
              },
              config: {
                enabled: true,
                refreshSignal: movementQuickActionRefreshSignal,
              },
            }}
            provided={{
              events: {
                onCreateMovementRequested: handleCreateMovement,
                onError: (notice) => {
                  showError({ message: notice.message });
                },
              },
            }}
          />
        );

  const profilePage = currentPage === 'profile' ? (
    <ProfilePage
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          refreshSignal: accountHubRefreshSignal,
          voiceEntryAvailable: pageRequired.voiceEntry.enabled,
          voiceWorkflowBusy,
          voiceMovementExperimentEnabled,
          voiceMovementExperimentLoading: experimentalFeatures.state.loading,
          voiceMovementExperimentSaving: experimentalFeatures.state.saving,
        },
      }}
      provided={{
        events: {
          onLoadPhaseChanged: setScreenLoadPhase,
          onSelectedAccountChanged: handleSelectedAccountChanged,
          onAccountsCountChanged: setAccountsCount,
          onImportRequested: openRestoreSheet,
          onMovementsImportRequested: openImportSheet,
          onBackupRequested: () => {
            void requestApplicationBackup().catch((err) => {
              showError(err instanceof Error ? err : { message: 'Unknown error' });
            });
          },
          onAccountMutated: handleProfileAccountMutated,
          onError: showError,
          onSetVoiceMovementExperimentEnabled: (enabled) => {
            void experimentalFeatures.commands.setVoiceMovementEntryEnabled(enabled);
          },
        },
      }}
    />
  ) : null;

  const movementsPage = (
    <MonthlyMovementsComponent
      required={{
        context: {
          accountId: null,
          scope: 'all',
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: recentTransactionsRefreshSignal,
        },
      }}
      provided={{
        events: {
          onVoided: () => {
            refresh('accountSummary', 'netWorth', 'recentTransactions', 'analytics');
          },
          onPostExpectedMovement: handlePostExpectedMovement,
          onEditExpectedMovement: handleEditExpectedMovement,
          onDuplicateMovement: handleDuplicateMovement,
        },
      }}
    />
  );

  const movementsSearchPage = currentPage === 'movementsSearch' ? (
    <MovementsSearchPage
      required={{
        core: pageRequired.core,
        refreshSignal: recentTransactionsRefreshSignal,
      }}
      provided={{
        events: {
          onPostExpectedMovement: handlePostExpectedMovement,
          onEditExpectedMovement: handleEditExpectedMovement,
          onDuplicateMovement: handleDuplicateMovement,
        },
      }}
    />
  ) : null;

  const analyticsPage = (
    <AnalyticsPageComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: analyticsRefreshSignal,
        },
      }}
      provided={{
        events: {
          onError: showError,
        },
      }}
    />
  );

  const pageHeader = currentPage === 'home'
    ? (
        <WorkspacePageHeader
          required={{
            title: 'Gonezo',
          }}
          provided={{
            commands: {
              openNotifications,
            },
          }}
        />
      )
    : currentPage === 'analytics'
      ? (
          <WorkspacePageHeader
            required={{
              title: 'Analytics',
            }}
            provided={{
              commands: {
                openNotifications,
              },
            }}
          />
        )
      : currentPage === 'movements'
        ? (
            <WorkspacePageHeader
              required={{
                title: 'Movements',
                searchAction: (
                  <Link className="gz-text-button gz-icon-button" to="/movements/search" aria-label="Search movements">
                    <i className="bi bi-search" aria-hidden />
                  </Link>
                ),
              }}
              provided={{
                commands: {
                  openNotifications,
                },
              }}
            />
          )
          : currentPage === 'profile'
          ? (
              <WorkspacePageHeader
                required={{
                  title: 'Profile',
                }}
                provided={{
                  commands: {
                    openNotifications,
                  },
                }}
              />
            )
          : null;

  const netWorthSummary = currentPage === 'home' ? (
    <NetWorthSummaryComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: netWorthRefreshSignal,
        },
      }}
      provided={{
        events: {
          onError: showError,
          onViewAccountsRequested: (currency) => {
            setAccountsSheetCurrency(currency);
          },
        },
      }}
    />
  ) : null;

  const currencyAccountsSheet = currentPage === 'home' ? (
    <CurrencyAccountsSheetComponent
      required={{
        context: { core: pageRequired.core },
        config: {
          open: accountsSheetCurrency !== null,
          currency: accountsSheetCurrency,
          refreshSignal: netWorthRefreshSignal,
        },
      }}
      provided={{
        events: {
          onClose: () => setAccountsSheetCurrency(null),
          onAccountSelected: (accountId) => {
            setSelectedAccountId(accountId);
            setAccountsSheetCurrency(null);
          },
          onManageAccountRequested: (accountId) => {
            setAccountsSheetCurrency(null);
            setManagedAccountId(accountId);
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const manageAccountSheet = currentPage === 'home' ? (
    <ManageAccountSheetComponent
      required={{
        context: { core: pageRequired.core, accountId: managedAccountId },
        config: { open: managedAccountId !== null, refreshSignal: accountHubRefreshSignal },
      }}
      provided={{
        events: {
          onClose: () => setManagedAccountId(null),
          onAccountMutated: () => {
            setManagedAccountId(null);
            handleAccountMutated();
          },
          onAccountDeleted: () => {
            setManagedAccountId(null);
            if (managedAccountId) handleAccountDeleted(managedAccountId);
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const homeExpectedMovements = currentPage === 'home' ? (
    <PendingExpectedOverviewComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: expectedMovementsRefreshSignal,
        },
      }}
      provided={{
        events: {
          onError: showError,
          onExpenseSelected: () => { void navigate('/movements/search?source=expected&type=expense'); },
          onIncomeSelected: () => { void navigate('/movements/search?source=expected&type=income'); },
        },
      }}
    />
  ) : null;

  const homeRecentMovements = currentPage === 'home' ? (
    <HomeRecentMovementsComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: recentTransactionsRefreshSignal,
        },
      }}
      provided={{
        events: {
          onSeeAll: () => {
            void navigate('/movements');
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const required: AccountPageViewRequired = {
    screen: {
      loadPhase: screenLoadPhase,
      error: '',
    },
    toast: {
      message: workspaceToast.toast.message,
      tone: workspaceToast.toast.tone,
      actionLabel: workspaceToast.toast.actionLabel,
    },
    sections: {
      pageHeader,
      netWorthSummary,
      accountHub: null,
      accountSummary: currentPage === 'home'
          ? (
            <>
              {currencyAccountsSheet}
              {manageAccountSheet}
              {homeExpectedMovements}
              {homeRecentMovements}
            </>
          )
          : currentPage === 'analytics'
            ? analyticsPage
            : currentPage === 'movementsSearch'
              ? movementsSearchPage
            : currentPage === 'profile'
            ? profilePage
            : null,
      transactionEntry: (
        <>
          {transactionEntry}
          {currentPage === 'movementsSearch' || currentPage === 'movementNew' ? null : dockNavigation}
        </>
      ),
      recentTransactions: currentPage === 'movements' ? movementsPage : null,
      transactionsImport: (
        <>
          <TransactionsImportComponent
            required={{
              context: { fileReader: pageRequired.importFileReader },
              state: { accountsCount, isOpen: importSheetOpen },
              status: { loadPhase: screenLoadPhase, submitPhase: importSubmitPhase },
            }}
            provided={{
              commands: { open: openImportSheet, close: closeImportSheet, submit: submitTransactionsImport },
            }}
          />
          <ApplicationBackupRestoreComponent
            required={{ isOpen: restoreSheetOpen }}
            provided={{ close: closeRestoreSheet, restore: requestApplicationBackupRestore }}
          />
        </>
      ),
    },
  };

  const provided: AccountPageViewProvided = {
    toast: {
      commands: {
        dismiss: clearToast,
        runAction: runToastAction,
      },
    },
  };

  return <AccountPageView required={required} provided={provided} />;
}
