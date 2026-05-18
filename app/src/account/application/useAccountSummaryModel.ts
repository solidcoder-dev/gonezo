import { useCallback, useEffect, useRef, useState } from 'react';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import type { AccountSummaryComponentProvided } from './AccountSummaryComponent.contract';

type FormEventLike = {
  preventDefault: () => void;
};

export type AccountSummaryState = {
  name: string;
  currency: string;
  balanceAmount: string;
};

export type AccountSummaryModelInput = {
  ports: AccountSummaryModelPorts;
  accountId: string | null;
  enabled: boolean;
  refreshSignal: boolean;
  confirm: (message: string) => boolean;
  events?: AccountSummaryComponentProvided['events'];
};

export type AccountSummaryModelPorts = {
  ledger: LedgerGatewayPort;
};

export type AccountSummaryModel = {
  state: {
    loading: boolean;
    managing: boolean;
    error: string;
    summary: AccountSummaryState | null;
    manageOpen: boolean;
    manageName: string;
  };
  commands: {
    openManage: () => void;
    closeManage: () => void;
    setManageName: (value: string) => void;
    submitRename: (event: FormEventLike) => Promise<void>;
    archiveAccount: () => Promise<void>;
    deleteAccount: () => Promise<void>;
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useAccountSummaryModel({
  ports,
  accountId,
  enabled,
  refreshSignal,
  confirm,
  events,
}: AccountSummaryModelInput): AccountSummaryModel {
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AccountSummaryState | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageName, setManageName] = useState('');

  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const {
    getAccountSummary,
    renameAccount,
    archiveAccount: archiveLedgerAccount,
    deleteAccount: deleteLedgerAccount,
  } = useLedgerAccounts(ports.ledger);

  const reportError = useCallback((raw: unknown) => {
    const message = toErrorMessage(raw);
    setError(message);
    eventsRef.current?.onError?.({ message });
  }, []);

  const refreshSummary = useCallback(async () => {
    if (!accountId) {
      setSummary(null);
      return;
    }
    const nextSummary = await getAccountSummary({ accountId });
    setSummary({
      name: nextSummary.name,
      currency: nextSummary.currency,
      balanceAmount: nextSummary.balanceAmount,
    });
  }, [accountId, getAccountSummary]);

  useEffect(() => {
    if (!enabled || !accountId) {
      setLoading(false);
      setSummary(null);
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        await refreshSummary();
      } catch (err) {
        if (!cancelled) {
          reportError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [accountId, enabled, refreshSignal, refreshSummary, reportError]);

  const submitRename = useCallback(async (event: FormEventLike) => {
    event.preventDefault();
    if (!accountId) {
      return;
    }
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
      setManageOpen(false);
      eventsRef.current?.onAccountMutated?.(accountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }, [accountId, manageName, refreshSummary, renameAccount, reportError]);

  const archiveAccount = useCallback(async () => {
    if (!summary || !accountId) {
      return;
    }
    if (!confirm(`Archive account "${summary.name}"?`)) {
      return;
    }
    setManaging(true);
    setError('');
    try {
      await archiveLedgerAccount({ accountId });
      await refreshSummary();
      setManageOpen(false);
      eventsRef.current?.onAccountMutated?.(accountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }, [accountId, archiveLedgerAccount, confirm, refreshSummary, reportError, summary]);

  const deleteAccount = useCallback(async () => {
    if (!summary || !accountId) {
      return;
    }
    if (!confirm(`Delete account "${summary.name}" and all its transactions? This cannot be undone.`)) {
      return;
    }
    setManaging(true);
    setError('');
    try {
      await deleteLedgerAccount({ accountId });
      setManageOpen(false);
      eventsRef.current?.onAccountDeleted?.(accountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }, [accountId, confirm, deleteLedgerAccount, reportError, summary]);

  const openManage = useCallback(() => {
    if (summary) {
      setManageName(summary.name);
    }
    setManageOpen(true);
  }, [summary]);

  return {
    state: {
      loading,
      managing,
      error,
      summary,
      manageOpen,
      manageName,
    },
    commands: {
      openManage,
      closeManage: () => setManageOpen(false),
      setManageName,
      submitRename,
      archiveAccount,
      deleteAccount,
    },
  };
}
