import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { mapAccountSummaryList } from './accountViewMappers';
import { AccountSwitcherView } from '../ui/AccountSwitcherView';
import type { AccountSummaryView } from '../domain/accountView.types';
import type { AccountHubComponentProps } from './AccountHubComponent.contract';

export type {
  AccountHubComponentProps,
  AccountHubComponentProvided,
  AccountHubComponentRequired,
} from './AccountHubComponent.contract';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function AccountHubComponent({ required, provided = {} }: AccountHubComponentProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState<AccountSummaryView[]>([]);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createName, setCreateName] = useState('Main account');
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createOpeningBalance, setCreateOpeningBalance] = useState('');

  const ledgerGateway = useMemo(() => createLedgerGateway(required.context.core), [required.context.core]);
  const ledgerAccounts = useLedgerAccounts(ledgerGateway);

  function reportLoadPhase(phase: 'loading' | 'ready' | 'error') {
    provided.events?.onLoadPhaseChanged?.(phase);
  }

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    provided.events?.onError?.({ message });
  }

  async function refreshAccounts(preferredAccountId?: string) {
    const [currenciesResult, accountsResult] = await Promise.all([
      ledgerAccounts.listSupportedCurrencies(),
      ledgerAccounts.listAccounts(),
    ]);

    setSupportedCurrencies(currenciesResult.items);
    if (currenciesResult.items.length > 0 && !currenciesResult.items.includes(createCurrency)) {
      setCreateCurrency(currenciesResult.items[0]);
    }

    const accountSummaries = mapAccountSummaryList(accountsResult.items);
    setAccounts(accountSummaries);
    provided.events?.onAccountsCountChanged?.(accountSummaries.length);

    if (accountSummaries.length === 0) {
      setSelectedAccountId('');
      provided.events?.onSelectedAccountChanged?.(null);
      return;
    }

    const nextSelectedAccountId = preferredAccountId && accountSummaries.some((item) => item.id === preferredAccountId)
      ? preferredAccountId
      : selectedAccountId && accountSummaries.some((item) => item.id === selectedAccountId)
        ? selectedAccountId
        : accountSummaries[0].id;

    setSelectedAccountId(nextSelectedAccountId);
    provided.events?.onSelectedAccountChanged?.(nextSelectedAccountId);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required.config.refreshSignal]);

  const controlsDisabled = loading || creating;

  async function submitCreateAccount(event: FormEvent) {
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
      const created = await ledgerAccounts.openAccount({
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
  }

  function selectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    provided.events?.onSelectedAccountChanged?.(accountId);
  }

  if (loading && accounts.length === 0) {
    return (
      <section>
        <p>Loading accounts...</p>
      </section>
    );
  }

  if (accounts.length === 0) {
    return (
      <>
        {error ? (
          <div className="banner error" role="alert">
            {error}
          </div>
        ) : null}

        <form className="stack section-gap" onSubmit={submitCreateAccount} aria-busy={creating}>
          <h2>Create your first account</h2>
          <input
            aria-label="Account name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <input
            aria-label="Opening balance"
            value={createOpeningBalance}
            onChange={(event) => setCreateOpeningBalance(event.target.value)}
            placeholder="Opening balance (optional)"
            inputMode="decimal"
          />
          <label className="stack">
            Currency
            <select
              aria-label="Currency"
              value={createCurrency}
              onChange={(event) => setCreateCurrency(event.target.value)}
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating account...' : 'Create account'}
          </button>
          <button type="button" className="text-button" onClick={provided.events?.onImportRequested}>
            Import from Mobills
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {createFormOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setCreateFormOpen(false)}>
          <section
            className="sheet-panel import-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Create account"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inline-header">
              <h3>Add account</h3>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close add account sheet"
                onClick={() => setCreateFormOpen(false)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
            <div className="import-sheet-content">
              <form className="stack" onSubmit={submitCreateAccount} aria-busy={creating}>
                <input
                  aria-label="Account name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                />
                <input
                  aria-label="Opening balance"
                  value={createOpeningBalance}
                  onChange={(event) => setCreateOpeningBalance(event.target.value)}
                  placeholder="Opening balance (optional)"
                  inputMode="decimal"
                />
                <label className="stack">
                  Currency
                  <select
                    aria-label="Currency"
                    value={createCurrency}
                    onChange={(event) => setCreateCurrency(event.target.value)}
                  >
                    {supportedCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={creating}>
                  {creating ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}

      <section className="section-gap account-switcher-section">
        <AccountSwitcherView
          required={{
            accounts,
            selectedAccountId,
            disabled: controlsDisabled,
          }}
          provided={{
            onSelect: async (accountId) => {
              selectAccount(accountId);
            },
            onAddAccount: () => setCreateFormOpen(true),
            onImport: provided.events?.onImportRequested ?? (() => undefined),
          }}
        />
      </section>
    </>
  );
}
