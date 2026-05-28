import { useState } from 'react';
import type { TransactionsImportRequest, TransactionsImportResult } from '../../imports/application/transactionsImport.types';
import { TransactionEntryComponent } from '../../transactions';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import { MonthlyMovementsComponent } from '../../movements';
import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase, SubmitPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accountsCore.port';
import { AccountHubComponent } from '../../account/application/AccountHub/AccountHubComponent';
import { AccountSummaryComponent } from '../../account/application/AccountSummary/AccountSummaryComponent';
import {
  expectedMovementToComposerPrefill,
  postExpectedMovementToComposerPrefill,
  scheduledMovementToComposerPrefill,
} from '../../account/application/movementComposerPrefill';

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
  const [transactionEntryPrefill, setTransactionEntryPrefill] = useState<TransactionEntryPrefillRequest | undefined>();

  const hasSelectedAccount = Boolean(selectedAccountId);

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
    setTransactionEntryPrefill(expectedMovementToComposerPrefill(movement, categoryName));
  }

  function editScheduledMovement(movement: ScheduledMovementView, categoryName?: string) {
    setTransactionEntryPrefill(scheduledMovementToComposerPrefill(movement, categoryName));
  }

  function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setTransactionEntryPrefill(postExpectedMovementToComposerPrefill(movement, categoryName));
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
          onAccountsCountChanged: setAccountsCount,
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
      accountHub: hasSelectedAccount ? null : accountHub,
      accountSummary: hasSelectedAccount ? (
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
      ) : null,
      transactionEntry: hasSelectedAccount
        ? (
            <TransactionEntryComponent
              required={{
                context: {
                  accountId: selectedAccountId,
                  core: pageRequired.core,
                },
                config: {
                  enabled: hasSelectedAccount,
                  prefillRequest: transactionEntryPrefill,
                },
              }}
              provided={{
                events: {
                  onRecorded: () => {
                    setRecentTransactionsRefreshSignal((previous) => !previous);
                    setAccountSummaryRefreshSignal((previous) => !previous);
                    setTransactionEntryPrefill(undefined);
                  },
                },
              }}
            />
          )
        : null,
      recentTransactions: hasSelectedAccount
        ? (
            <MonthlyMovementsComponent
              required={{
                context: {
                  accountId: selectedAccountId,
                  core: pageRequired.core,
                },
                config: {
                  enabled: hasSelectedAccount,
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
          )
        : null,
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
