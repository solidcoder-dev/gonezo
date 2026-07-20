import { useEffect, useRef, useState } from 'react';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { SheetView } from '../../../shared/ui/SheetView';
import type { AccountWorkspacePort } from '../accounts.port';
import type { AccountBalanceItem } from '../accountBalances.port';
import { CurrencyAccountsSheetView } from '../../ui/CurrencyAccountsSheet/CurrencyAccountsSheetView';
import type { CurrencyAccountView } from '../../ui/CurrencyAccountsSheet/CurrencyAccountsSheetView.contract';

export type CurrencyAccountsSheetComponentProps = {
  required: {
    context: { core: AccountWorkspacePort };
    config: { open: boolean; currency: string | null; refreshSignal?: unknown };
  };
  provided?: {
    events?: {
      onClose: () => void;
      onAccountSelected?: (accountId: string) => void;
      onManageAccountRequested?: (accountId: string) => void;
      onError?: (error: { message: string }) => void;
    };
  };
};

type LoadPhase = 'idle' | 'loading' | 'success' | 'empty' | 'error';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toAccountView(account: AccountBalanceItem): CurrencyAccountView {
  return {
    accountId: account.accountId,
    name: account.name,
    formattedBalance: formatCurrencyAmount(account.balanceAmount, account.currency),
    currency: account.currency,
    type: account.type,
    status: account.status === 'archived' ? 'archived' : 'active',
    isDefault: account.isDefault,
  };
}

export function CurrencyAccountsSheetComponent({ required, provided = {} }: CurrencyAccountsSheetComponentProps) {
  const { core } = required.context;
  const { open, currency, refreshSignal } = required.config;
  const [accounts, setAccounts] = useState<CurrencyAccountView[]>([]);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>('idle');
  const [error, setError] = useState('');
  const eventsRef = useRef(provided.events);

  useEffect(() => {
    eventsRef.current = provided.events;
  }, [provided.events]);

  useEffect(() => {
    if (!open || !currency) {
      return;
    }
    const selectedCurrency = currency;
    let cancelled = false;

    async function loadAccounts() {
      setLoadPhase('loading');
      setError('');
      try {
        const result = await core.accountsListBalances();
        if (cancelled) return;
        const currencyCode = selectedCurrency.toUpperCase();
        const matchingAccounts = result.items
          .filter((account) => account.currency.toUpperCase() === currencyCode)
          .map(toAccountView);
        setAccounts(matchingAccounts);
        setLoadPhase(matchingAccounts.length > 0 ? 'success' : 'empty');
      } catch (cause) {
        if (!cancelled) {
          const message = toErrorMessage(cause);
          setError(message);
          setLoadPhase('error');
          eventsRef.current?.onError?.({ message });
        }
      }
    }

    void loadAccounts();
    return () => { cancelled = true; };
  }, [core, currency, open, refreshSignal]);

  if (!open || !currency) return null;

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: `${currency} accounts`,
          title: `${currency} accounts`,
          closeLabel: `Close ${currency} accounts`,
          contentClassName: 'import-sheet-content',
        },
        data: {
          body: (
            <CurrencyAccountsSheetView
              required={{
                config: {},
                data: { accounts, currency },
                state: {},
                status: { loadPhase: loadPhase === 'idle' ? 'loading' : loadPhase, error },
              }}
              provided={{
                commands: {
                  close: provided.events?.onClose ?? (() => undefined),
                  selectAccount: (accountId) => provided.events?.onAccountSelected?.(accountId),
                  manageAccount: (accountId) => provided.events?.onManageAccountRequested?.(accountId),
                },
              }}
            />
          ),
        },
        state: { open },
        status: {},
      }}
      provided={{ commands: { close: provided.events?.onClose ?? (() => undefined) } }}
    />
  );
}
