import { useCallback, useEffect, useRef, useState } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type { MovementAccountSelectorItem } from '../ui/MovementAccountSelector/MovementAccountSelectorView';
import type { MovementQuickActionComponentProvided } from './MovementQuickActionComponent.contract';
import type { TransactionType } from './transactions.types';

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
      selectedMovementType: TransactionType;
      draftOpen: boolean;
      accountSelectorOpen: boolean;
      typeSelectorOpen: boolean;
    };
    status: {
      loading: boolean;
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      openDraft: () => void;
      closeDraft: () => void;
      expandDraft: () => void;
      toggleAccountSelector: () => void;
      toggleTypeSelector: () => void;
      closeAccountSelector: () => void;
      closeTypeSelector: () => void;
      selectAccount: (accountId: string) => void;
      selectMovementType: (type: TransactionType) => void;
    };
  };
};

type UseMovementQuickActionModelInput = {
  ports: MovementQuickActionModelPorts;
  enabled: boolean;
  refreshSignal?: boolean;
  draftRequest?: {
    requestId: number;
    account: { id: string; name: string };
    type: TransactionType;
  };
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
  draftRequest,
  events,
}: UseMovementQuickActionModelInput): MovementQuickActionModel {
  const [loading, setLoading] = useState(enabled);
  const [accounts, setAccounts] = useState<MovementAccountSelectorItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState<TransactionType>('expense');
  const [draftOpen, setDraftOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const selectedAccountIdRef = useRef(selectedAccountId);
  const eventsRef = useRef(events);
  const draftRequestId = draftRequest?.requestId;
  const draftRequestAccountId = draftRequest?.account.id;
  const draftRequestType = draftRequest?.type;

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  useEffect(() => {
    if (!enabled || !draftRequestId || !draftRequestAccountId || !draftRequestType) {
      return;
    }
    selectedAccountIdRef.current = draftRequestAccountId;
    setSelectedAccountId(draftRequestAccountId);
    setSelectedMovementType(draftRequestType);
    setAccountSelectorOpen(false);
    setTypeSelectorOpen(false);
    setDraftOpen(true);
  }, [draftRequestAccountId, draftRequestId, draftRequestType, enabled]);

  const reportError = useCallback((error: unknown) => {
    eventsRef.current?.onError?.({ message: toErrorMessage(error) });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!enabled) {
        setAccounts([]);
        setSelectedAccountId('');
        setDefaultAccountId('');
        setSelectedMovementType('expense');
        setDraftOpen(false);
        setAccountSelectorOpen(false);
        setTypeSelectorOpen(false);
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
        const fallbackAccountId = defaultAccountId && activeAccounts.some((account) => account.id === defaultAccountId)
          ? defaultAccountId
          : activeAccounts[0]?.id ?? '';
        const nextSelectedAccountId = currentSelectedAccountId
          && activeAccounts.some((account) => account.id === currentSelectedAccountId)
          ? currentSelectedAccountId
          : fallbackAccountId;

        setAccounts(activeAccounts);
        setDefaultAccountId(fallbackAccountId);
        selectedAccountIdRef.current = nextSelectedAccountId;
        setSelectedAccountId(nextSelectedAccountId);
        if (!activeAccounts.some((account) => account.id === nextSelectedAccountId)) {
          setAccountSelectorOpen(false);
          setTypeSelectorOpen(false);
          setDraftOpen(false);
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

  function resetDraftContext() {
    const fallbackAccountId = defaultAccountId || accounts[0]?.id || '';
    selectedAccountIdRef.current = fallbackAccountId;
    setSelectedAccountId(fallbackAccountId);
    setSelectedMovementType('expense');
    setAccountSelectorOpen(false);
    setTypeSelectorOpen(false);
  }

  return {
    required: {
      state: {
        accounts,
        selectedAccountId,
        selectedAccountName: selectedAccount?.name ?? '',
        selectedMovementType,
        draftOpen,
        accountSelectorOpen,
        typeSelectorOpen,
      },
      status: {
        loading,
        disabled,
      },
    },
    provided: {
      commands: {
        openDraft: () => {
          if (!disabled && selectedAccount) {
            const movement = {
              account: { id: selectedAccount.id, name: selectedAccount.name },
              type: 'expense' as const,
            };
            resetDraftContext();
            eventsRef.current?.onCreateMovementRequested?.(movement);
          }
        },
        closeDraft: () => {
          setDraftOpen(false);
          resetDraftContext();
        },
        expandDraft: () => {
          if (!disabled && selectedAccount) {
            const movement = {
              account: { id: selectedAccount.id, name: selectedAccount.name },
              type: selectedMovementType,
            };
            setDraftOpen(false);
            resetDraftContext();
            eventsRef.current?.onCreateMovementRequested?.(movement);
          }
        },
        toggleAccountSelector: () => {
          if (!disabled) {
            setAccountSelectorOpen((previous) => !previous);
            setTypeSelectorOpen(false);
          }
        },
        toggleTypeSelector: () => {
          if (!disabled) {
            setTypeSelectorOpen((previous) => !previous);
            setAccountSelectorOpen(false);
          }
        },
        closeAccountSelector: () => setAccountSelectorOpen(false),
        closeTypeSelector: () => setTypeSelectorOpen(false),
        selectAccount: (accountId) => {
          const account = accounts.find((item) => item.id === accountId);
          if (account) {
            selectedAccountIdRef.current = account.id;
            setSelectedAccountId(account.id);
            setAccountSelectorOpen(false);
          }
        },
        selectMovementType: (type) => {
          setSelectedMovementType(type);
          setTypeSelectorOpen(false);
        },
      },
    },
  };
}
