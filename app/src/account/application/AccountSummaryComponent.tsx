import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import type { AccountSummaryComponentProps } from './AccountSummaryComponent.contract';

export type {
  AccountSummaryComponentProps,
  AccountSummaryComponentProvided,
  AccountSummaryComponentRequired,
} from './AccountSummaryComponent.contract';

type AccountSummaryState = {
  name: string;
  currency: string;
  balanceAmount: string;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function AccountSummaryComponent({ required, provided = {} }: AccountSummaryComponentProps) {
  const { accountId, core } = required.context;
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AccountSummaryState | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageName, setManageName] = useState('');

  const ledgerGateway = useMemo(() => createLedgerGateway(core), [core]);
  const ledgerAccounts = useLedgerAccounts(ledgerGateway);

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    provided.events?.onError?.({ message });
  }

  async function refreshSummary() {
    if (!accountId) {
      setSummary(null);
      return;
    }
    const nextSummary = await ledgerAccounts.getAccountSummary({ accountId });
    setSummary({
      name: nextSummary.name,
      currency: nextSummary.currency,
      balanceAmount: nextSummary.balanceAmount,
    });
  }

  useEffect(() => {
    if (!required.config.enabled || !accountId) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required.config.enabled, accountId, required.config.refreshSignal]);

  if (!required.config.enabled || !accountId || !summary) {
    return null;
  }

  const activeAccountId = accountId;

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    const name = manageName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }

    setManaging(true);
    setError('');
    try {
      await ledgerAccounts.renameAccount({ accountId: activeAccountId, name });
      await refreshSummary();
      setManageOpen(false);
      provided.events?.onAccountMutated?.(activeAccountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }

  async function archiveAccount() {
    if (!summary) {
      return;
    }
    if (!window.confirm(`Archive account "${summary.name}"?`)) {
      return;
    }
    setManaging(true);
    setError('');
    try {
      await ledgerAccounts.archiveAccount({ accountId: activeAccountId });
      await refreshSummary();
      setManageOpen(false);
      provided.events?.onAccountMutated?.(activeAccountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }

  async function deleteAccount() {
    if (!summary) {
      return;
    }
    if (!window.confirm(`Delete account "${summary.name}" and all its transactions? This cannot be undone.`)) {
      return;
    }
    setManaging(true);
    setError('');
    try {
      await ledgerAccounts.deleteAccount({ accountId: activeAccountId });
      setManageOpen(false);
      provided.events?.onAccountDeleted?.(activeAccountId);
    } catch (err) {
      reportError(err);
    } finally {
      setManaging(false);
    }
  }

  return (
    <>
      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="summary-card section-gap" aria-busy={loading}>
        <div className="summary-header">
          {required.config.headerSlot ?? <h2>{summary.name}</h2>}
          <button
            type="button"
            className="text-button icon-button summary-menu-button"
            aria-label="Account settings"
            onClick={() => {
              setManageName(summary.name);
              setManageOpen(true);
            }}
            disabled={managing}
          >
            <i className="bi bi-gear" aria-hidden />
          </button>
        </div>
        <p className="summary-label">Net balance</p>
        <div className="summary-amount">
          {formatCurrencyAmount(summary.balanceAmount, summary.currency)}
        </div>
      </section>

      {manageOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={() => setManageOpen(false)}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Manage account"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inline-header">
              <h3>Manage account</h3>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close account management"
                onClick={() => setManageOpen(false)}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>

            <form className="stack" onSubmit={submitRename} aria-busy={managing}>
              <label className="stack">
                Account name
                <input
                  aria-label="Manage account name"
                  value={manageName}
                  onChange={(event) => setManageName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                />
              </label>

              <div className="quick-row">
                <button type="submit" disabled={managing}>
                  Save name
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={archiveAccount}
                  disabled={managing}
                >
                  Archive account
                </button>
              </div>

              <p className="hint">Archived accounts are hidden from the active list and cannot accept new transactions.</p>

              <button
                type="button"
                className="danger-button"
                onClick={deleteAccount}
                disabled={managing}
              >
                Delete account
              </button>
              <p className="hint">Delete removes the account and all its transactions permanently.</p>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
