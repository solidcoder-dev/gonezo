import { useCallback, useEffect, useRef, useState } from 'react';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { LoadPhase } from '../domain/accountPage.types';
import type { AccountSummaryView } from '../domain/accountView.types';
import { mapAccountSummaryList } from './accountViewMappers';
import type { AccountHubComponentProvided } from './AccountHubComponent.contract';
import type { UserPreferencesPort } from './accountsCore.port';

type FormEventLike = {
  preventDefault: () => void;
};

export type AccountHubModelInput = {
  ports: AccountHubModelPorts;
  refreshSignal: boolean;
  events?: AccountHubComponentProvided['events'];
};

export type AccountHubModelPorts = {
  ledger: LedgerGatewayPort;
  preferences: UserPreferencesPort;
};

export type AccountHubModel = {
  state: {
    loading: boolean;
    creating: boolean;
    error: string;
    accounts: AccountSummaryView[];
    supportedCurrencies: string[];
    selectedAccountId: string;
    defaultAccountId: string | null;
    createFormOpen: boolean;
    createName: string;
    createCurrency: string;
    createOpeningBalance: string;
    controlsDisabled: boolean;
  };
  commands: {
    submitCreateAccount: (event: FormEventLike) => Promise<void>;
    selectAccount: (accountId: string) => void;
    restoreAccount: (accountId: string) => Promise<void>;
    setDefaultAccount: (accountId: string) => Promise<void>;
    clearDefaultAccount: () => Promise<void>;
    openCreateForm: () => void;
    closeCreateForm: () => void;
    setCreateName: (value: string) => void;
    setCreateCurrency: (value: string) => void;
    setCreateOpeningBalance: (value: string) => void;
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useAccountHubModel({ ports, refreshSignal, events }: AccountHubModelInput): AccountHubModel {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState<AccountSummaryView[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createName, setCreateName] = useState('Main account');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createOpeningBalance, setCreateOpeningBalance] = useState('');

  const eventsRef = useRef(events);
  const selectedAccountIdRef = useRef(selectedAccountId);
  const createCurrencyRef = useRef(createCurrency);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId;
  }, [selectedAccountId]);

  useEffect(() => {
    createCurrencyRef.current = createCurrency;
  }, [createCurrency]);

  const {
    listSupportedCurrencies,
    listAccounts,
    openAccount,
    restoreAccount: restoreLedgerAccount,
  } = useLedgerAccounts(ports.ledger);

  const reportLoadPhase = useCallback((phase: LoadPhase) => {
    eventsRef.current?.onLoadPhaseChanged?.(phase);
  }, []);

  const reportError = useCallback((raw: unknown) => {
    const message = toErrorMessage(raw);
    setError(message);
    eventsRef.current?.onError?.({ message });
  }, []);

  const refreshAccounts = useCallback(async (preferredAccountId?: string) => {
    const [currenciesResult, accountsResult, preferencesResult] = await Promise.all([
      listSupportedCurrencies(),
      listAccounts(),
      ports.preferences.preferencesGet(),
    ]);

    setSupportedCurrencies(currenciesResult.items);
    if (currenciesResult.items.length > 0 && !currenciesResult.items.includes(createCurrencyRef.current)) {
      const nextCurrency = currenciesResult.items[0];
      createCurrencyRef.current = nextCurrency;
      setCreateCurrency(nextCurrency);
    }

    const accountSummaries = mapAccountSummaryList(accountsResult.items)
      .filter((account) => account.status !== 'deleted');
    const activeAccountSummaries = accountSummaries.filter((account) => account.status === 'active');
    const resolvedDefaultAccountId = preferencesResult.defaultAccountId ?? null;
    setAccounts(accountSummaries);
    setDefaultAccountId(resolvedDefaultAccountId);
    eventsRef.current?.onAccountsCountChanged?.(activeAccountSummaries.length);

    if (activeAccountSummaries.length === 0) {
      selectedAccountIdRef.current = '';
      setSelectedAccountId('');
      eventsRef.current?.onSelectedAccountChanged?.(null);
      return;
    }

    const currentSelectedAccountId = selectedAccountIdRef.current;
    const nextSelectedAccountId = preferredAccountId && activeAccountSummaries.some((item) => item.id === preferredAccountId)
      ? preferredAccountId
      : currentSelectedAccountId && activeAccountSummaries.some((item) => item.id === currentSelectedAccountId)
        ? currentSelectedAccountId
        : resolvedDefaultAccountId && activeAccountSummaries.some((item) => item.id === resolvedDefaultAccountId)
          ? resolvedDefaultAccountId
          : activeAccountSummaries[0].id;

    selectedAccountIdRef.current = nextSelectedAccountId;
    setSelectedAccountId(nextSelectedAccountId);
    eventsRef.current?.onSelectedAccountChanged?.(nextSelectedAccountId);
  }, [listAccounts, listSupportedCurrencies, ports.preferences]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      reportLoadPhase('loading');
      try {
        await refreshAccounts();
        if (!cancelled) {
          reportLoadPhase('ready');
        }
      } catch (err) {
        if (!cancelled) {
          reportError(err);
          reportLoadPhase('error');
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
  }, [refreshAccounts, refreshSignal, reportError, reportLoadPhase]);

  const submitCreateAccount = useCallback(async (event: FormEventLike) => {
    event.preventDefault();
    setError('');

    const name = createName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }

    const currency = createCurrency.trim().toUpperCase();
    if (!supportedCurrencies.includes(currency)) {
      setError('Select a supported currency.');
      return;
    }

    const openingBalanceRaw = createOpeningBalance.trim();
    if (openingBalanceRaw && Number.isNaN(Number(openingBalanceRaw))) {
      setError('Opening balance must be a valid number.');
      return;
    }

    setCreating(true);
    try {
      const created = await openAccount({
        name,
        type: 'cash',
        currency,
        openingBalanceAmount: openingBalanceRaw || undefined,
      });
      await refreshAccounts(created.id);
      setCreateOpeningBalance('');
      setCreateFormOpen(false);
    } catch (err) {
      reportError(err);
    } finally {
      setCreating(false);
    }
  }, [createCurrency, createName, createOpeningBalance, openAccount, refreshAccounts, reportError, supportedCurrencies]);

  const selectAccount = useCallback((accountId: string) => {
    selectedAccountIdRef.current = accountId;
    setSelectedAccountId(accountId);
    eventsRef.current?.onSelectedAccountChanged?.(accountId);
  }, []);

  const restoreAccount = useCallback(async (accountId: string) => {
    setCreating(true);
    setError('');
    try {
      await restoreLedgerAccount({ accountId });
      await refreshAccounts(accountId);
    } catch (err) {
      reportError(err);
      throw err;
    } finally {
      setCreating(false);
    }
  }, [refreshAccounts, reportError, restoreLedgerAccount]);

  const setDefaultAccount = useCallback(async (accountId: string) => {
    setError('');
    try {
      await ports.preferences.preferencesSetDefaultAccount({ accountId });
      setDefaultAccountId(accountId);
    } catch (err) {
      reportError(err);
      throw err;
    }
  }, [ports.preferences, reportError]);

  const clearDefaultAccount = useCallback(async () => {
    setError('');
    try {
      await ports.preferences.preferencesClearDefaultAccount();
      setDefaultAccountId(null);
    } catch (err) {
      reportError(err);
      throw err;
    }
  }, [ports.preferences, reportError]);

  return {
    state: {
      loading,
      creating,
      error,
      accounts,
      supportedCurrencies,
      selectedAccountId,
      defaultAccountId,
      createFormOpen,
      createName,
      createCurrency,
      createOpeningBalance,
      controlsDisabled: loading || creating,
    },
    commands: {
      submitCreateAccount,
      selectAccount,
      restoreAccount,
      setDefaultAccount,
      clearDefaultAccount,
      openCreateForm: () => setCreateFormOpen(true),
      closeCreateForm: () => setCreateFormOpen(false),
      setCreateName,
      setCreateCurrency,
      setCreateOpeningBalance,
    },
  };
}
