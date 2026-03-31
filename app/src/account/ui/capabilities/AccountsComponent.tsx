import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { AccountSwitcherView } from '../AccountSwitcherView';
import type { AccountsComponentProps } from './AccountsComponent.contract';

export type {
  AccountsComponentProps,
  AccountsComponentProvided,
  AccountsComponentRequired,
} from './AccountsComponent.contract';

export function AccountsComponent({ required, provided }: AccountsComponentProps) {
  const { state, status } = required;
  const importRequested = provided.events?.onImportRequested;
  const controlsDisabled = status.isRefreshing || status.isManaging || status.isPostingTransaction;

  if (state.accounts.length === 0) {
    return (
      <form className="stack section-gap" onSubmit={provided.commands.submitCreate} aria-busy={status.isCreating}>
        <h2>Create your first account</h2>
        <input
          aria-label="Account name"
          value={state.createForm.name}
          onChange={(event) => provided.commands.setCreateName(event.target.value)}
          placeholder="Account name"
          autoComplete="off"
        />
        <input
          aria-label="Opening balance"
          value={state.createForm.openingBalance}
          onChange={(event) => provided.commands.setCreateOpeningBalance(event.target.value)}
          placeholder="Opening balance (optional)"
          inputMode="decimal"
        />
        <label className="stack">
          Currency
          <select
            aria-label="Currency"
            value={state.createForm.currency}
            onChange={(event) => provided.commands.setCreateCurrency(event.target.value)}
          >
            {state.supportedCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={status.isCreating}>
          {status.isCreating ? 'Creating account...' : 'Create account'}
        </button>
        <button type="button" className="text-button" onClick={importRequested}>
          Import from Mobills
        </button>
      </form>
    );
  }

  return (
    <>
      {state.createForm.isOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={provided.commands.closeCreateForm}>
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
                onClick={provided.commands.closeCreateForm}
              >
                ×
              </button>
            </div>
            <div className="import-sheet-content">
              <form className="stack" onSubmit={provided.commands.submitCreate} aria-busy={status.isCreating}>
                <input
                  aria-label="Account name"
                  value={state.createForm.name}
                  onChange={(event) => provided.commands.setCreateName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                />
                <input
                  aria-label="Opening balance"
                  value={state.createForm.openingBalance}
                  onChange={(event) => provided.commands.setCreateOpeningBalance(event.target.value)}
                  placeholder="Opening balance (optional)"
                  inputMode="decimal"
                />
                <label className="stack">
                  Currency
                  <select
                    aria-label="Currency"
                    value={state.createForm.currency}
                    onChange={(event) => provided.commands.setCreateCurrency(event.target.value)}
                  >
                    {state.supportedCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={status.isCreating}>
                  {status.isCreating ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}

      <section className="section-gap">
        <AccountSwitcherView
          required={{
            accounts: state.accounts,
            selectedAccountId: state.selectedAccountId,
            disabled: controlsDisabled,
          }}
          provided={{
            onSelect: provided.commands.selectAccount,
            onAddAccount: provided.commands.openCreateForm,
            onImport: importRequested ?? (() => undefined),
          }}
        />
      </section>

      {state.selectedAccount ? (
        <section className="summary-card section-gap">
          <div className="summary-header">
            <h2>{state.selectedAccount.name}</h2>
            <button
              type="button"
              className="text-button icon-button summary-menu-button"
              aria-label="Account options"
              onClick={provided.commands.openManageForm}
              disabled={controlsDisabled}
            >
              ...
            </button>
          </div>
          <p className="summary-label">Net balance</p>
          <div className="summary-amount">
            {formatCurrencyAmount(state.balanceAmount, state.selectedAccount.currency)}
          </div>
        </section>
      ) : null}

      {state.manageForm.isOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={provided.commands.closeManageForm}>
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
                onClick={provided.commands.closeManageForm}
              >
                ×
              </button>
            </div>

            <form className="stack" onSubmit={provided.commands.submitRename} aria-busy={status.isManaging}>
              <label className="stack">
                Account name
                <input
                  aria-label="Manage account name"
                  value={state.manageForm.name}
                  onChange={(event) => provided.commands.setManageName(event.target.value)}
                  placeholder="Account name"
                  autoComplete="off"
                />
              </label>

              <div className="quick-row">
                <button type="submit" disabled={status.isManaging}>
                  Save name
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={provided.commands.archiveSelected}
                  disabled={status.isManaging}
                >
                  Archive account
                </button>
              </div>

              <p className="hint">Archived accounts stay visible but cannot accept new transactions.</p>

              <button
                type="button"
                className="danger-button"
                onClick={provided.commands.deleteSelected}
                disabled={status.isManaging}
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
