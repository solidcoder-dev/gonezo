import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { TransactionsImportRequest, TransactionsImportResult } from '../../imports/application/transactionsImport.types';
import { MovementDockNavigationComponent, TransactionEntryComponent } from '../../transactions/index';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import type { TransactionType } from '../../transactions/application/transactions.types';
import { MonthlyMovementsComponent } from '../../movements/index';
import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase, SubmitPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import { AccountHubComponent } from '../../account/application/AccountHub/AccountHubComponent';
import { AccountSummaryComponent } from '../../account/application/AccountSummary/AccountSummaryComponent';
import {
  expectedMovementToComposerPrefill,
  postExpectedMovementToComposerPrefill,
  scheduledMovementToComposerPrefill,
} from '../../account/application/movementComposerPrefill';
import { ProfilePage } from './ProfilePage';

export type WorkspacePageRequired = {
  core: AccountWorkspacePort;
};

type WorkspacePageProps = {
  required: WorkspacePageRequired;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function WorkspacePage({ required: pageRequired }: WorkspacePageProps) {
  const location = useLocation();
  const [screenLoadPhase, setScreenLoadPhase] = useState<LoadPhase>('loading');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountsCount, setAccountsCount] = useState(0);

  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importSubmitPhase, setImportSubmitPhase] = useState<SubmitPhase>('idle');

  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  const [accountHubRefreshSignal, setAccountHubRefreshSignal] = useState(false);
  const [accountSummaryRefreshSignal, setAccountSummaryRefreshSignal] = useState(false);
  const [recentTransactionsRefreshSignal, setRecentTransactionsRefreshSignal] = useState(false);
  const [movementQuickActionRefreshSignal, setMovementQuickActionRefreshSignal] = useState(false);
  const [transactionEntryPrefill, setTransactionEntryPrefill] = useState<TransactionEntryPrefillRequest | undefined>();
  const [movementEntryAccountId, setMovementEntryAccountId] = useState<string | null>(null);
  const [movementEntryAccountName, setMovementEntryAccountName] = useState<string | null>(null);
  const [movementEntryType, setMovementEntryType] = useState<TransactionType | undefined>();
  const [movementEntryOpenSignal, setMovementEntryOpenSignal] = useState(0);
  const [movementDraftRequest, setMovementDraftRequest] = useState<{
    requestId: number;
    account: { id: string; name: string };
    type: TransactionType;
  } | undefined>();

  const hasSelectedAccount = Boolean(selectedAccountId);
  const transactionEntryAccountId = movementEntryAccountId ?? selectedAccountId;
  const currentPage = location.pathname.startsWith('/analytics')
    ? 'analytics'
    : location.pathname.startsWith('/movements') && !location.pathname.startsWith('/movements/search')
      ? 'movements'
      : location.pathname.startsWith('/profile')
        ? 'profile'
        : 'home';

  function handleSelectedAccountChanged(accountId: string | null) {
    setSelectedAccountId((previousAccountId) => {
      if (previousAccountId === accountId) {
        return previousAccountId;
      }
      setAccountSummaryRefreshSignal((previous) => !previous);
      setRecentTransactionsRefreshSignal((previous) => !previous);
      return accountId;
    });
  }

  async function submitTransactionsImport(input: TransactionsImportRequest): Promise<TransactionsImportResult> {
    setImportSubmitPhase('submitting');
    try {
      const result = input.source === 'mobills'
        ? await pageRequired.core.mobillsImport({ fileBase64: input.fileBase64, policy: input.policy })
        : await pageRequired.core.movementsImportBackup({ fileBase64: input.fileBase64 });
      setImportSubmitPhase('succeeded');
      setToastMessage(`Import finished: ${result.importedCount} imported, ${result.failedCount} failed.`);
      setToastActionLabel('');
      setToastAction(null);
      setAccountHubRefreshSignal((previous) => !previous);
      setMovementQuickActionRefreshSignal((previous) => !previous);
      setAccountSummaryRefreshSignal((previous) => !previous);
      setRecentTransactionsRefreshSignal((previous) => !previous);
      return result;
    } catch (err) {
      setImportSubmitPhase('failed');
      throw err instanceof Error ? err : new Error(toErrorMessage(err));
    }
  }

  async function requestMovementsBackup(): Promise<void> {
    const result = await pageRequired.core.movementsExportBackup();
    setToastMessage(`Backup saved: ${result.fileName} (${result.postedMovementCount} posted movements).`);
    setToastActionLabel('');
    setToastAction(null);
  }

  function editExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(expectedMovementToComposerPrefill(movement, categoryName));
  }

  function editScheduledMovement(movement: ScheduledMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.sourceAccountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(scheduledMovementToComposerPrefill(movement, categoryName));
  }

  function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(postExpectedMovementToComposerPrefill(movement, categoryName));
  }

  function clearMovementEntryAccount() {
    setMovementEntryAccountId(null);
    setMovementEntryAccountName(null);
    setMovementEntryType(undefined);
  }

  function createMovementForAccount(movement: { account: { id: string; name: string }; type: TransactionType }) {
    setMovementEntryAccountId(movement.account.id);
    setMovementEntryAccountName(movement.account.name);
    setMovementEntryType(movement.type);
    setTransactionEntryPrefill(undefined);
    setMovementEntryOpenSignal((previous) => previous + 1);
  }

  function collapseMovementComposerToDraft() {
    if (!movementEntryAccountId || !movementEntryAccountName || !movementEntryType) {
      clearMovementEntryAccount();
      return;
    }

    setMovementDraftRequest((previous) => ({
      requestId: (previous?.requestId ?? 0) + 1,
      account: { id: movementEntryAccountId, name: movementEntryAccountName },
      type: movementEntryType,
    }));
    clearMovementEntryAccount();
  }

  const accountHub = (
    <AccountHubComponent
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
          onAccountsCountChanged: (count) => {
            setAccountsCount((previousCount) => {
              if (previousCount > 0 && previousCount !== count) {
                setMovementQuickActionRefreshSignal((previous) => !previous);
              }
              return count;
            });
          },
          onImportRequested: () => setImportSheetOpen(true),
          onBackupRequested: () => {
            void requestMovementsBackup().catch((err) => {
              setToastMessage(toErrorMessage(err));
              setToastActionLabel('');
              setToastAction(null);
            });
          },
        },
      }}
    />
  );

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
              movementAccountContext: movementEntryAccountName ? { name: movementEntryAccountName, type: movementEntryType } : undefined,
            },
          }}
          provided={{
            events: {
              onRecorded: () => {
                setRecentTransactionsRefreshSignal((previous) => !previous);
                setAccountSummaryRefreshSignal((previous) => !previous);
                setTransactionEntryPrefill(undefined);
                clearMovementEntryAccount();
              },
              onClosed: clearMovementEntryAccount,
              onCollapsed: collapseMovementComposerToDraft,
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
          draftRequest: movementDraftRequest,
        },
      }}
      provided={{
        events: {
          onCreateMovementRequested: createMovementForAccount,
        },
      }}
    />
  );

  const homeAccountSummary = hasSelectedAccount ? (
    <AccountSummaryComponent
      required={{
        context: {
          core: pageRequired.core,
          accountId: selectedAccountId,
        },
        config: {
          enabled: hasSelectedAccount,
          refreshSignal: accountSummaryRefreshSignal,
          headerSlot: accountHub,
        },
      }}
      provided={{
        events: {
          onAccountMutated: () => {
            setAccountHubRefreshSignal((previous) => !previous);
            setAccountSummaryRefreshSignal((previous) => !previous);
          },
          onAccountDeleted: (accountId) => {
            if (selectedAccountId === accountId) {
              setSelectedAccountId(null);
            }
            setAccountHubRefreshSignal((previous) => !previous);
            setAccountSummaryRefreshSignal((previous) => !previous);
            setRecentTransactionsRefreshSignal((previous) => !previous);
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
            setAccountSummaryRefreshSignal((previous) => !previous);
          },
          onExpectedPosted: () => {
            setAccountSummaryRefreshSignal((previous) => !previous);
          },
          onExpectedDismissed: () => {
            setAccountSummaryRefreshSignal((previous) => !previous);
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
          onImportRequested: () => setImportSheetOpen(true),
          onBackupRequested: () => {
            void requestMovementsBackup().catch((err) => {
              setToastMessage(toErrorMessage(err));
              setToastActionLabel('');
              setToastAction(null);
            });
          },
          onAccountMutated: () => {
            setAccountHubRefreshSignal((previous) => !previous);
            setMovementQuickActionRefreshSignal((previous) => !previous);
            setAccountSummaryRefreshSignal((previous) => !previous);
          },
          onError: (error) => {
            setToastMessage(error.message);
            setToastActionLabel('');
            setToastAction(null);
          },
        },
      }}
    />
  );

  const analyticsPage = (
    <section className="section-gap">
      <h1>Analytics</h1>
      <p className="hint">Coming soon</p>
    </section>
  );

  const required: AccountPageViewRequired = {
    screen: {
      loadPhase: screenLoadPhase,
      error: '',
    },
    toast: {
      message: toastMessage,
      actionLabel: toastActionLabel,
    },
    sections: {
      accountHub: currentPage === 'home' && !hasSelectedAccount ? accountHub : null,
      accountSummary: currentPage === 'home'
        ? homeAccountSummary
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
              open: () => setImportSheetOpen(true),
              close: () => setImportSheetOpen(false),
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
        dismiss: () => {
          setToastMessage('');
          setToastActionLabel('');
          setToastAction(null);
        },
        runAction: () => toastAction?.(),
      },
    },
  };

  return <AccountPageView required={required} provided={provided} />;
}
