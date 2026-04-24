import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LedgerAccountItem } from '../../shared/domain/corePort';
import { RecentTransactionsComponent, type TransactionsCorePort } from '../../transactions';
import type { AccountsCorePort } from '../../account/application/useAccountPageModel';

type MovementsSearchPageProps = {
  required: {
    core: AccountsCorePort;
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function resolveInitialAccountId(accounts: LedgerAccountItem[], queryValue: string | null): string | null {
  if (accounts.length === 0) {
    return null;
  }
  if (queryValue) {
    const found = accounts.find((account) => account.id === queryValue);
    if (found) {
      return found.id;
    }
  }
  return accounts[0].id;
}

export function MovementsSearchPage({ required }: MovementsSearchPageProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<LedgerAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const result = await required.core.ledgerListAccounts();
        if (cancelled) {
          return;
        }
        const query = new URLSearchParams(location.search);
        const requestedAccountId = query.get('accountId');
        setAccounts(result.items);
        setSelectedAccountId(resolveInitialAccountId(result.items, requestedAccountId));
      } catch (err) {
        if (!cancelled) {
          setError(toErrorMessage(err));
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
  }, [location.search, required.core]);

  return (
    <section className="app-screen">
      <div className="inline-header">
        <h2>Search movements</h2>
        <button type="button" className="text-button" onClick={() => navigate(-1)}>
          Back to movements
        </button>
      </div>

      <p className="hint">Advanced filters and full movement exploration.</p>

      {loading ? <p role="status">Loading accounts...</p> : null}
      {!loading && error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <label className="stack">
          Search account
          <select
            aria-label="Search account"
            value={selectedAccountId ?? ''}
            onChange={(event) => {
              setSelectedAccountId(event.target.value || null);
              setRefreshSignal((previous) => !previous);
            }}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!loading && !error && accounts.length === 0 ? <p>No accounts available.</p> : null}

      <RecentTransactionsComponent
        key={selectedAccountId ?? 'no-account'}
        required={{
          context: {
            accountId: selectedAccountId,
            core: required.core as TransactionsCorePort,
          },
          config: {
            enabled: Boolean(selectedAccountId),
            refreshSignal,
          },
        }}
      />
    </section>
  );
}
