import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TransactionsImportFileReaderPort } from '../../imports/application/transactionsImportFileReader.port';
import { MovementDockNavigationComponent, TransactionEntryComponent } from '../../transactions/index';
import { MonthlyMovementsComponent } from '../../movements/index';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import { AccountsRailComponent } from '../../account/application/AccountsRail/AccountsRailComponent';
import { ProfilePage } from './ProfilePage';
import { NetWorthSummaryComponent } from './NetWorthSummaryComponent';
import { ExpectedMovementsCardComponent } from '../../movements/application/ExpectedMovementsCardComponent';
import { AnalyticsPageComponent } from '../../analytics/application/AnalyticsPageComponent';
import { HomeRecentMovementsComponent, type HomeRecentMovementsPort } from './HomeRecentMovementsComponent';
import { HomeHeaderView } from '../ui/HomeHeader/HomeHeaderView';
import { useWorkspaceRefreshSignals } from './useWorkspaceRefreshSignals';
import { useWorkspaceImportCoordinator } from './useWorkspaceImportCoordinator';
import { useWorkspaceToast } from './useWorkspaceToast';
import { useMovementComposerCoordinator } from './useMovementComposerCoordinator';
import { resolveWorkspaceRoutePage } from './workspaceNavigation';
import { useWorkspaceAccountEvents } from './useWorkspaceAccountEvents';

export type WorkspacePageRequired = {
  core: WorkspacePagePort;
  importFileReader: TransactionsImportFileReaderPort;
};

export type WorkspacePagePort = AccountWorkspacePort & AnalyticsPort & HomeRecentMovementsPort;

type WorkspacePageProps = {
  required: WorkspacePageRequired;
};

export function WorkspacePage({ required: pageRequired }: WorkspacePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [screenLoadPhase, setScreenLoadPhase] = useState<LoadPhase>('loading');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountsCount, setAccountsCount] = useState(0);

  const workspaceToast = useWorkspaceToast();
  const workspaceRefresh = useWorkspaceRefreshSignals();
  const { refresh } = workspaceRefresh;
  const {
    accountHubRefreshSignal,
    accountSummaryRefreshSignal,
    analyticsRefreshSignal,
    expectedMovementsRefreshSignal,
    movementQuickActionRefreshSignal,
    netWorthRefreshSignal,
    recentTransactionsRefreshSignal,
  } = workspaceRefresh.signals;
  const { clearToast, runToastAction, showError, showToast } = workspaceToast.actions;
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
    editExpectedMovement,
    editScheduledMovement,
    postExpectedMovement,
    resetTransactionEntryPrefill,
  } = movementComposer.actions;
  const currentPage = resolveWorkspaceRoutePage(location.pathname);
  const {
    handleAccountDeleted,
    handleAccountMutated,
    handleAccountsCountChanged,
    handleProfileAccountMutated,
    handleSelectedAccountChanged,
  } = useWorkspaceAccountEvents({
    selectedAccountId,
    setAccountsCount,
    setSelectedAccountId,
    refresh,
  });

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

  const dockNavigation = (
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
        },
      }}
    />
  );

  const homeAccountsRail = currentPage === 'home' ? (
    <AccountsRailComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: accountSummaryRefreshSignal,
        },
      }}
      provided={{
          events: {
            onSelectedAccountChanged: handleSelectedAccountChanged,
          onAccountsCountChanged: handleAccountsCountChanged,
          onAccountMutated: handleAccountMutated,
          onAccountDeleted: handleAccountDeleted,
          onError: showError,
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
          onExpectedPosted: () => {
            refresh('accountSummary', 'netWorth', 'expectedMovements', 'recentTransactions', 'analytics');
          },
          onExpectedDismissed: () => {
            refresh('accountSummary', 'expectedMovements');
          },
          onPostExpectedMovement: postExpectedMovement,
          onEditExpectedMovement: editExpectedMovement,
          onEditScheduledMovement: editScheduledMovement,
        },
      }}
    />
  );

  const profilePage = (
    <ProfilePage
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          refreshSignal: accountHubRefreshSignal,
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

  const netWorthSummary = currentPage === 'home' ? (
    <>
      <HomeHeaderView provided={{ commands: { openNotifications: () => undefined } }} />
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
          },
        }}
      />
    </>
  ) : null;

  const homeExpectedMovements = currentPage === 'home' ? (
    <ExpectedMovementsCardComponent
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
          onExpectedDismissed: () => {
            refresh('accountSummary', 'expectedMovements');
          },
          onPostExpectedMovement: postExpectedMovement,
          onEditExpectedMovement: editExpectedMovement,
          onError: showError,
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
      actionLabel: workspaceToast.toast.actionLabel,
    },
    sections: {
      netWorthSummary,
      accountHub: null,
      accountSummary: currentPage === 'home'
        ? (
            <>
              {homeAccountsRail}
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
