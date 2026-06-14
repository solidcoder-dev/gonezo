import { useCallback, useEffect, useRef, useState } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type { MovementAccountSelectorItem } from '../ui/MovementAccountSelector/MovementAccountSelectorView';
import type { MovementQuickActionComponentProvided } from './MovementQuickActionComponent.contract';

export type MovementQuickActionModelPorts = {
  ledger: {
    ledgerListAccounts(): Promise<{ items: LedgerAccountItem[] }>;
  };
  preferences: {
    preferencesGet(): Promise<{ defaultAccountId?: string | null }>;
  };
};

export type MovementQuickActionModel = {
  required: {
    state: {
      accounts: MovementAccountSelectorItem[];
      selectedAccountId: string;
      selectedAccountName: string;
      accountSelectorOpen: boolean;
    };
    status: {
      loading: boolean;
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      createMovement: () => void;
      toggleAccountSelector: () => void;
      closeAccountSelector: () => void;
      selectAccount: (accountId: string) => void;
    };
  };
};

type UseMovementQuickActionModelInput = {
  ports: MovementQuickActionModelPorts;
  enabled: boolean;
  refreshSignal?: boolean;
  events?: MovementQuickActionComponentProvided['events'];
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function toSelectorAccount(account: LedgerAccountItem): MovementAccountSelectorItem {
  return {
    id: account.id,
    name: account.name,
    currency: account.currency,
  };
}

export function useMovementQuickActionModel({
  ports,
  enabled,
  refreshSignal,
  events,
}: UseMovementQuickActionModelInput): MovementQuickActionModel {
  const [loading, setLoading] = useState(enabled);
  const [accounts, setAccounts] = useState<MovementAccountSelectorItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const selectedAccountIdRef = useRef(selectedAccountId);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  const reportError = useCallback((error: unknown) => {
    eventsRef.current?.onError?.({ message: toErrorMessage(error) });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled) {
        setAccounts([]);
        setSelectedAccountId('');
        setAccountSelectorOpen(false);
        return;
      }

      setLoading(true);
      try {
        const [accountsResult, preferencesResult] = await Promise.all([
          ports.ledger.ledgerListAccounts(),
          ports.preferences.preferencesGet(),
        ]);
        if (cancelled) {
          return;
        }

        const activeAccounts = accountsResult.items
          .filter((account) => account.status === 'active')
          .map(toSelectorAccount);
        const currentSelectedAccountId = selectedAccountIdRef.current;
        const defaultAccountId = preferencesResult.defaultAccountId ?? '';
        const nextSelectedAccountId = currentSelectedAccountId
          && activeAccounts.some((account) => account.id === currentSelectedAccountId)
          ? currentSelectedAccountId
          : defaultAccountId && activeAccounts.some((account) => account.id === defaultAccountId)
            ? defaultAccountId
            : activeAccounts[0]?.id ?? '';

        setAccounts(activeAccounts);
        selectedAccountIdRef.current = nextSelectedAccountId;
        setSelectedAccountId(nextSelectedAccountId);
        if (!activeAccounts.some((account) => account.id === nextSelectedAccountId)) {
          setAccountSelectorOpen(false);
        }
      } catch (error) {
        if (!cancelled) {
          reportError(error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, ports.ledger, ports.preferences, refreshSignal, reportError]);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const disabled = loading || !enabled || accounts.length === 0 || !selectedAccountId;

  return {
    required: {
      state: {
        accounts,
        selectedAccountId,
        selectedAccountName: selectedAccount?.name ?? '',
        accountSelectorOpen,
      },
      status: {
        loading,
        disabled,
      },
    },
    provided: {
      commands: {
        createMovement: () => {
          if (!disabled && selectedAccount) {
            eventsRef.current?.onCreateMovementRequested?.({ id: selectedAccount.id, name: selectedAccount.name });
          }
        },
        toggleAccountSelector: () => {
          if (!disabled) {
            setAccountSelectorOpen((previous) => !previous);
          }
        },
        closeAccountSelector: () => setAccountSelectorOpen(false),
        selectAccount: (accountId) => {
          const account = accounts.find((item) => item.id === accountId);
          if (account) {
            setAccountSelectorOpen(false);
            eventsRef.current?.onCreateMovementRequested?.({ id: account.id, name: account.name });
          }
        },
      },
    },
  };
}
