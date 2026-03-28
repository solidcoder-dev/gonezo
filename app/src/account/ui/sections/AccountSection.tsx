import { AccountSwitcherView } from '../AccountSwitcherView';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import type { AccountPageActions, AccountPageState } from '../accountPageView.contract';

type Props = {
  account: AccountPageState['account'];
  isPostingTransaction: boolean;
  accountActions: AccountPageActions['account'];
  importsActions: AccountPageActions['imports'];
};

export function AccountSection({ account, isPostingTransaction, accountActions, importsActions }: Props) {
  if (account.accounts.length === 0) {
    return (
      <form className="stack section-gap" onSubmit={accountActions.submitCreateAccount} aria-busy={account.isCreating}>
        <h2>Create your first account</h2>
        <input
          aria-label="Account name"
          value={account.createForm.name}
          onChange={(event) => accountActions.setNewAccountName(event.target.value)}
          placeholder="Account name"
          autoComplete="off"
        />
        <input
          aria-label="Opening balance"
          value={account.createForm.openingBalance}
          onChange={(event) => accountActions.setNewAccountOpeningBalance(event.target.value)}
          placeholder="Opening balance (optional)"
          inputMode="decimal"
        />
        <label className="stack">
          Currency
          <select
            aria-label="Currency"
            value={account.createForm.currency}
            onChange={(event) => accountActions.setNewAccountCurrency(event.target.value)}
          >
            {account.supportedCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={account.isCreating}>
          {account.isCreating ? 'Creating account...' : 'Create account'}
        </button>
        <button type="button" className="text-button" onClick={importsActions.openSheet}>
          Import from Mobills
        </button>
      </form>
    );
  }

  const accountSwitcherDisabled = account.isRefreshing || isPostingTransaction || account.manage.isSubmitting;

  return (
    <>
      {account.createForm.isVisible ? (
        <form className="stack" onSubmit={accountActions.submitCreateAccount} aria-busy={account.isCreating}>
          <h3>Add account</h3>
          <input
            aria-label="Account name"
            value={account.createForm.name}
            onChange={(event) => accountActions.setNewAccountName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <input
            aria-label="Opening balance"
            value={account.createForm.openingBalance}
            onChange={(event) => accountActions.setNewAccountOpeningBalance(event.target.value)}
            placeholder="Opening balance (optional)"
            inputMode="decimal"
          />
          <label className="stack">
            Currency
            <select
              aria-label="Currency"
              value={account.createForm.currency}
              onChange={(event) => accountActions.setNewAccountCurrency(event.target.value)}
            >
              {account.supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <div className="quick-row">
            <button type="submit" disabled={account.isCreating}>
              {account.isCreating ? 'Creating account...' : 'Create account'}
            </button>
            <button type="button" className="text-button" onClick={accountActions.closeCreateAccountForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="section-gap">
        <AccountSwitcherView
          accounts={account.accounts}
          selectedAccountId={account.selectedAccountId}
          disabled={accountSwitcherDisabled}
          onSelect={accountActions.selectAccount}
          onAddAccount={accountActions.openCreateAccountForm}
          onManageAccount={accountActions.openManageAccountSheet}
          onImport={importsActions.openSheet}
        />
      </section>

      {account.selectedAccount ? (
        <section className="summary-card section-gap">
          <h2>{account.selectedAccount.name}</h2>
          <p className="summary-label">Net balance</p>
          <div className="summary-amount">
            {formatCurrencyAmount(account.balanceAmount, account.selectedAccount.currency)}
          </div>
        </section>
      ) : null}
    </>
  );
}
