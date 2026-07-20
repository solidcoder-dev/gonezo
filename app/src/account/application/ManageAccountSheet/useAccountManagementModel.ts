import { useCallback, useEffect, useRef, useState } from 'react';
import type { LedgerGatewayPort } from '../../../ledger/application/ledgerGateway.port';
import { useLedgerAccounts } from '../../../ledger/application/useLedgerAccounts';

type FormEventLike = {
  preventDefault: () => void;
};

export type AccountManagementEvents = {
  onAccountMutated?: (accountId: string) => void;
  onAccountDeleted?: (accountId: string) => void;
  onError?: (error: { message: string }) => void;
};

export type AccountManagementModelInput = {
  ports: { ledger: LedgerGatewayPort };
  accountId: string | null;
  enabled: boolean;
  refreshSignal?: unknown;
  confirm: (message: string) => boolean;
  events?: AccountManagementEvents;
};

export type AccountManagementModel = {
  state: {
    loading: boolean;
    managing: boolean;
    error: string;
    summary: {
      name: string;
      currency: string;
      balanceAmount: string;
    } | null;
    manageName: string;
  };
  commands: {
    setManageName: (value: string) => void;
    submitRename: (event: FormEventLike) => Promise<void>;
    archiveAccount: () => Promise<void>;
    deleteAccount: () => Promise<void>;
  };
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAccountManagementModel({
  ports,
  accountId,
  enabled,
  refreshSignal,
  confirm,
  events,
}: AccountManagementModelInput): AccountManagementModel {
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AccountManagementModel['state']['summary']>(null);
  const [manageName, setManageName] = useState('');
  const eventsRef = useRef(events);
  const { getAccountSummary, renameAccount, archiveAccount, deleteAccount } = useLedgerAccounts(ports.ledger);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const reportError = useCallback((cause: unknown) => {
    const message = toErrorMessage(cause);
    setError(message);
    eventsRef.current?.onError?.({ message });
  }, []);

  const refreshSummary = useCallback(async () => {
    if (!accountId) {
      setSummary(null);
      setManageName('');
      return;
    }
    const nextSummary = await getAccountSummary({ accountId });
    const nextState = {
      name: nextSummary.name,
      currency: nextSummary.currency,
      balanceAmount: nextSummary.balanceAmount,
    };
    setSummary(nextState);
    setManageName(nextState.name);
  }, [accountId, getAccountSummary]);

  useEffect(() => {
    if (!enabled || !accountId) {
      setLoading(false);
      setSummary(null);
      setManageName('');
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        await refreshSummary();
      } catch (cause) {
        if (!cancelled) reportError(cause);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [accountId, enabled, refreshSignal, refreshSummary, reportError]);

  const submitRename = useCallback(async (event: FormEventLike) => {
    event.preventDefault();
    if (!accountId) return;
    const name = manageName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }
    setManaging(true);
    setError('');
    try {
      await renameAccount({ accountId, name });
      await refreshSummary();
      eventsRef.current?.onAccountMutated?.(accountId);
    } catch (cause) {
      reportError(cause);
    } finally {
      setManaging(false);
    }
  }, [accountId, manageName, refreshSummary, renameAccount, reportError]);

  const archive = useCallback(async () => {
    if (!summary || !accountId || !confirm(`Archive account "${summary.name}"?`)) return;
    setManaging(true);
    setError('');
    try {
      await archiveAccount({ accountId });
      eventsRef.current?.onAccountMutated?.(accountId);
    } catch (cause) {
      reportError(cause);
    } finally {
      setManaging(false);
    }
  }, [accountId, archiveAccount, confirm, reportError, summary]);

  const remove = useCallback(async () => {
    if (!summary || !accountId || !confirm(`Delete account "${summary.name}" and all its transactions? This cannot be undone.`)) return;
    setManaging(true);
    setError('');
    try {
      await deleteAccount({ accountId });
      eventsRef.current?.onAccountDeleted?.(accountId);
    } catch (cause) {
      reportError(cause);
    } finally {
      setManaging(false);
    }
  }, [accountId, confirm, deleteAccount, reportError, summary]);

  return {
    state: { loading, managing, error, summary, manageName },
    commands: {
      setManageName,
      submitRename,
      archiveAccount: archive,
      deleteAccount: remove,
    },
  };
}
