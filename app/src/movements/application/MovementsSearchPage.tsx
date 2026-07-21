import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type { MovementsSearchPagePort } from './movementsSearch.port';
import type { ExpectedMovementView } from './movementsView.types';
import { useMovementsSearchModel } from './useMovementsSearchModel';
import { MovementsSearchFilters } from '../ui/MovementsSearch/MovementsSearchFilters';
import { MovementsSearchResults } from '../ui/MovementsSearch/MovementsSearchResults';
import { parseMovementsSearchRoutePreset } from './movementsSearchRoutePreset';

type MovementsSearchPageProps = {
  required: {
    core: MovementsSearchPagePort;
    refreshSignal: boolean;
  };
  provided: {
    events: {
      onPostExpectedMovement: (movement: ExpectedMovementView, categoryName?: string) => void;
      onEditExpectedMovement: (movement: ExpectedMovementView, categoryName?: string) => void;
    };
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function resolveInitialAccountId(accounts: LedgerAccountItem[], queryValue: string | null): string | null {
  if (queryValue) {
    const found = accounts.find((account) => account.id === queryValue);
    if (found) {
      return found.id;
    }
  }
  return null;
}

export type { MovementsSearchPageProps };

export function MovementsSearchPage({ required, provided }: MovementsSearchPageProps) {
  const location = useLocation();
  const routePreset = parseMovementsSearchRoutePreset(location.search);

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
    accounts,
    accountId: selectedAccountId,
    enabled: accounts.length > 0,
    initialFilters: routePreset,
  });
  const refreshResultsRef = useRef(searchModel.provided.commands.refreshResults);
  const accountsAvailableRef = useRef(false);
  refreshResultsRef.current = searchModel.provided.commands.refreshResults;
  accountsAvailableRef.current = accounts.length > 0;

  useEffect(() => {
    if (accountsAvailableRef.current) {
      void refreshResultsRef.current();
    }
  }, [required.refreshSignal]);

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
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {!loading && !error && accounts.length === 0 ? <p>No accounts available.</p> : null}

      {accounts.length > 0 ? (
        <>
          <MovementsSearchFilters
            required={{
              state: searchModel.required.state,
              status: searchModel.required.status,
            }}
            provided={{
              commands: searchModel.provided.commands,
            }}
          />

          <MovementsSearchResults
            required={{
              state: searchModel.required.state,
              status: searchModel.required.status,
            }}
            provided={{
              context: {
                core: required.core,
              },
              commands: searchModel.provided.commands,
              events: provided.events,
            }}
          />
        </>
      ) : null}
    </section>
  );
}
