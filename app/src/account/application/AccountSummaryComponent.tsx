import { useMemo } from 'react';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import { SheetView } from '../../shared/ui/SheetView';
import type { AccountSummaryComponentProps } from './AccountSummaryComponent.contract';
import { useAccountSummaryModel } from './useAccountSummaryModel';

export type {
  AccountSummaryComponentProps,
  AccountSummaryComponentProvided,
  AccountSummaryComponentRequired,
} from './AccountSummaryComponent.contract';

export function AccountSummaryComponent({ required, provided = {} }: AccountSummaryComponentProps) {
  const { accountId, core } = required.context;
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(core),
  }), [core]);
  const model = useAccountSummaryModel({
    ports,
    accountId,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    confirm: (message) => window.confirm(message),
    events: provided.events,
  });
  const {
    loading,
    managing,
    error,
    summary,
    manageOpen,
    manageName,
  } = model.state;
  const {
    openManage,
    closeManage,
    setManageName,
    submitRename,
    archiveAccount,
    deleteAccount,
  } = model.commands;

  if (!required.config.enabled || !accountId || !summary) {
    return null;
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
            onClick={openManage}
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
        <SheetView
          required={{
            config: {
              ariaLabel: 'Manage account',
              title: 'Manage account',
              closeLabel: 'Close account management',
            },
            data: {
              body: (
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
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: closeManage } }}
        />
      ) : null}
    </>
  );
}
