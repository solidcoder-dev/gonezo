import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { TransactionsImportFileReaderPort } from '../../imports/application/transactionsImportFileReader.port';
import { MovementDockNavigationComponent, TransactionEntryComponent } from '../../transactions/index';
import { ExperimentalMovementDockNavigationComponent } from '../../transactions/application/ExperimentalMovementDockNavigationComponent';
import { MonthlyMovementsComponent } from '../../movements/index';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
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

export type WorkspacePagePort = AccountWorkspacePort & AnalyticsPort & HomeRecentMovementsPort & PendingExpectedOverviewPort;

type WorkspacePageProps = {
  required: WorkspacePageRequired;
};

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
    refresh,
    showToast,
  });
  const { importSheetOpen, importSubmitPhase } = importCoordinator.state;
  const {
    closeImportSheet,
    openImportSheet,
    requestMovementsBackup,
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

  function collapseMovementComposerToDraft() {
    clearMovementEntryAccount();
  }

  const transactionEntry = transactionEntryAccountId
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
              openSignal: movementEntryOpenSignal,
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
              onClosed: clearMovementEntryAccount,
              onCollapsed: collapseMovementComposerToDraft,
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
  const dockNavigation = experimentalFeatures.state.loading
    ? null
    : voiceMovementExperimentActive
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
                onCreateMovementRequested: createMovementForAccount,
                onMovementEntryDraftReady: ({ account, draft }) => {
                  createMovementForDraft({ account, draft });
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
                onCreateMovementRequested: createMovementForAccount,
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
          onImportRequested: openImportSheet,
          onBackupRequested: () => {
            void requestMovementsBackup().catch((err) => {
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
          onPostExpectedMovement: postExpectedMovement,
          onEditExpectedMovement: editExpectedMovement,
        },
      }}
    />
  );

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
                  <Link className="text-button icon-button" to="/movements/search" aria-label="Search movements">
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
            : currentPage === 'profile'
            ? profilePage
            : null,
      transactionEntry: (
        <>
          {transactionEntry}
          {dockNavigation}
        </>
      ),
      recentTransactions: currentPage === 'movements' ? movementsPage : null,
      transactionsImport: (
        <TransactionsImportComponent
          required={{
            context: {
              fileReader: pageRequired.importFileReader,
            },
            state: {
              accountsCount,
              isOpen: importSheetOpen,
            },
            status: {
              loadPhase: screenLoadPhase,
              submitPhase: importSubmitPhase,
            },
          }}
          provided={{
            commands: {
              open: openImportSheet,
              close: closeImportSheet,
              submit: submitTransactionsImport,
            },
          }}
        />
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
