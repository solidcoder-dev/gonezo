import { useState } from 'react';
import type { TransactionsImportPolicyInput, TransactionsImportResult } from '../../imports/domain/transactionsImport.types';
import { TransactionEntryComponent, type TransactionsCorePort } from '../../transactions';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import { MonthlyMovementsComponent } from '../../movements';
import type { ExpectedMovementView } from '../../movements/domain/movementsView.types';
import { AccountPageView } from '../ui/AccountPageView';
import { TransactionsImportComponent } from '../ui/capabilities/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../ui/accountPageView.contract';
import type { LoadPhase, SubmitPhase } from '../domain/accountPage.types';
import type { AccountsCorePort } from './accountsCore.port';
import { AccountHubComponent } from './AccountHubComponent';
import { AccountSummaryComponent } from './AccountSummaryComponent';

export type AccountPageRequired = {
  core: AccountsCorePort;
};

type AccountPageProps = {
  required: AccountPageRequired;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function toDateInputValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export function AccountPage({ required: pageRequired }: AccountPageProps) {
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

  async function submitTransactionsImport(input: {
    fileBase64: string;
    policy?: TransactionsImportPolicyInput;
  }): Promise<TransactionsImportResult> {
    setImportSubmitPhase('submitting');
    try {
      const result = await pageRequired.core.mobillsImport(input);
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

  function editExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setTransactionEntryPrefill({
      requestId: Date.now(),
      editedExpectedMovementId: movement.id,
      mode: movement.type,
      amount: movement.amount,
      date: toDateInputValue(movement.expectedAt),
      note: movement.merchant || movement.description || '',
      categoryId: categoryName ?? movement.categoryId,
      splitItems: movement.splitItems,
    });
  }

  function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setTransactionEntryPrefill({
      requestId: Date.now(),
      postExpectedMovementId: movement.id,
      mode: movement.type,
      amount: movement.amount,
      date: toDateInputValue(movement.expectedAt),
      note: movement.merchant || movement.description || '',
      categoryId: categoryName ?? movement.categoryId,
      splitItems: movement.splitItems,
    });
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
                  core: pageRequired.core as TransactionsCorePort,
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
                  core: pageRequired.core as TransactionsCorePort,
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
