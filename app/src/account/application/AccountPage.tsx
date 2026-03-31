import { useState } from 'react';
import type { TransactionsImportPolicyInput, TransactionsImportResult } from '../../imports/domain/transactionsImport.types';
import { RecentTransactionsComponent, TransactionEntryComponent, type TransactionsCorePort } from '../../transactions';
import { AccountPageView } from '../ui/AccountPageView';
import { TransactionsImportComponent } from '../ui/capabilities/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../ui/accountPageView.contract';
import type { LoadPhase, SubmitPhase } from '../domain/accountPage.types';
import type { AccountsCorePort } from './useAccountPageModel';
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

  const hasSelectedAccount = Boolean(selectedAccountId);

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
      accountHub: (
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
              onSelectedAccountChanged: (accountId) => {
                setSelectedAccountId(accountId);
                setAccountSummaryRefreshSignal((previous) => !previous);
                setRecentTransactionsRefreshSignal((previous) => !previous);
              },
              onAccountsCountChanged: setAccountsCount,
              onImportRequested: () => setImportSheetOpen(true),
            },
          }}
        />
      ),
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
                },
              }}
              provided={{
                events: {
                  onRecorded: () => {
                    setRecentTransactionsRefreshSignal((previous) => !previous);
                    setAccountSummaryRefreshSignal((previous) => !previous);
                  },
                },
              }}
            />
          )
        : null,
      recentTransactions: hasSelectedAccount
        ? (
            <RecentTransactionsComponent
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
