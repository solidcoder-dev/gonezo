import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLedgerGateway } from '../../../ledger/application/ledgerGateway';
import { SheetView } from '../../../shared/ui/SheetView';
import { AccountSwitcherView } from '../../ui/AccountSwitcher/AccountSwitcherView';
import type { AccountHubComponentProps } from './AccountHubComponent.contract';
import { useAccountHubModel } from './useAccountHubModel';

export type {
  AccountHubComponentProps,
  AccountHubComponentProvided,
  AccountHubComponentRequired,
} from './AccountHubComponent.contract';

export function AccountHubComponent({ required, provided = {} }: AccountHubComponentProps) {
  const navigate = useNavigate();
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(required.context.core),
    preferences: required.context.core,
  }), [required.context.core]);
  const model = useAccountHubModel({
    ports,
    refreshSignal: required.config.refreshSignal,
    events: provided.events,
  });
  const {
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
    controlsDisabled,
  } = model.state;
  const {
    submitCreateAccount,
    selectAccount,
    restoreAccount,
    setDefaultAccount,
    clearDefaultAccount,
    openCreateForm,
    closeCreateForm,
    setCreateName,
    setCreateCurrency,
    setCreateOpeningBalance,
  } = model.commands;

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
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        ) : null}

        <form className="vstack gap-3 gz-section-gap" onSubmit={(event) => { void submitCreateAccount(event); }} aria-busy={creating}>
          <h2>Create your first account</h2>
          <input
            className="form-control"
            aria-label="Account name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <input
            className="form-control"
            aria-label="Opening balance"
            value={createOpeningBalance}
            onChange={(event) => setCreateOpeningBalance(event.target.value)}
            placeholder="Opening balance (optional)"
            inputMode="decimal"
          />
          <label className="d-grid gap-2">
            Currency
            <select
              className="form-select"
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
          <button type="submit" className="btn btn-primary w-100" disabled={creating}>
            {creating ? 'Creating account...' : 'Create account'}
          </button>
          <div className="gz-quick-row">
            <button type="button" className="btn btn-outline-secondary" onClick={() => { void provided.events?.onImportRequested?.(); }}>
              Import backup
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => { void provided.events?.onBackupRequested?.(); }}>
              Backup
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      {error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      ) : null}

      {createFormOpen ? (
        <SheetView
          required={{
            config: {
              ariaLabel: 'Create account',
              title: 'Add account',
              closeLabel: 'Close add account sheet',
              panelClassName: 'import-sheet',
              contentClassName: 'import-sheet-content',
            },
            data: {
              body: (
                <form className="vstack gap-3" onSubmit={(event) => { void submitCreateAccount(event); }} aria-busy={creating}>
                  <input
                    className="form-control"
                    aria-label="Account name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Account name"
                    autoComplete="off"
                  />
                  <input
                    className="form-control"
                    aria-label="Opening balance"
                    value={createOpeningBalance}
                    onChange={(event) => setCreateOpeningBalance(event.target.value)}
                    placeholder="Opening balance (optional)"
                    inputMode="decimal"
                  />
                  <label className="d-grid gap-2">
                    Currency
                    <select
                      className="form-select"
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
                  <button type="submit" className="btn btn-primary w-100" disabled={creating}>
                    {creating ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: closeCreateForm } }}
        />
      ) : null}

      <section className="gz-section-gap account-switcher-section">
        <AccountSwitcherView
          required={{
            accounts,
            selectedAccountId,
            defaultAccountId,
            disabled: controlsDisabled,
          }}
          provided={{
            onSelect: (accountId) => { void selectAccount(accountId); },
            onRestoreAccount: restoreAccount,
            onSetDefaultAccount: setDefaultAccount,
            onClearDefaultAccount: clearDefaultAccount,
            onAddAccount: openCreateForm,
            onManageTaxonomy: () => { void navigate('/taxonomy'); },
            onImport: provided.events?.onImportRequested ?? (() => undefined),
            onBackup: provided.events?.onBackupRequested ?? (() => undefined),
          }}
        />
      </section>
    </>
  );
}
