import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LedgerAccountItem } from '../../shared/domain/corePort';
import type { MovementsSearchPagePort } from './movementsSearch.port';
import { useMovementsSearchModel } from './useMovementsSearchModel';
import { MovementsSearchFilters } from '../ui/MovementsSearchFilters';
import { MovementsSearchResults } from '../ui/MovementsSearchResults';

type MovementsSearchPageProps = {
  required: {
    core: MovementsSearchPagePort;
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<LedgerAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

  const searchModel = useMovementsSearchModel({
    core: required.core,
    accountId: selectedAccountId,
    enabled: Boolean(selectedAccountId),
  });

  return (
    <section className="app-screen">
      <div className="inline-header">
        <h2>Search</h2>
        <Link to="/" className="text-button icon-button" aria-label="Close search">
          <i className="bi bi-x-lg" aria-hidden />
        </Link>
      </div>

      {loading ? <p role="status">Loading accounts...</p> : null}
      {!loading && error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}
      {searchModel.error ? (
        <div className="banner error" role="alert">
          {searchModel.error}
        </div>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <label className="search-account-context">
          <span className="visually-hidden">Account</span>
          <select
            aria-label="Search account"
            value={selectedAccountId ?? ''}
            onChange={(event) => setSelectedAccountId(event.target.value || null)}
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

      {selectedAccountId ? (
        <>
          <MovementsSearchFilters
            required={{
              error: searchModel.required.error,
              state: searchModel.required.state,
              status: searchModel.required.status,
            }}
            provided={{
              commands: searchModel.provided.commands,
            }}
          />

          <MovementsSearchResults
            required={{
              error: searchModel.required.error,
              state: searchModel.required.state,
              status: searchModel.required.status,
            }}
            provided={{
              commands: searchModel.provided.commands,
            }}
          />
        </>
      ) : null}
    </section>
  );
}
