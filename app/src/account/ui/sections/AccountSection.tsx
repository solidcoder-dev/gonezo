import { AccountSwitcherView } from '../AccountSwitcherView';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../accountPageView.contract';

export type AccountSectionRequired = {
  account: AccountPageViewRequired['account'];
  isPostingTransaction: boolean;
};

export type AccountSectionProvided = {
  account: AccountPageViewProvided['account'];
  imports: AccountPageViewProvided['imports'];
};

type Props = {
  required: AccountSectionRequired;
  provided: AccountSectionProvided;
};

export function AccountSection({ required, provided }: Props) {
  if (required.account.accounts.length === 0) {
    return (
      <form
        className="stack section-gap"
        onSubmit={provided.account.submitCreateAccount}
        aria-busy={required.account.isCreating}
      >
        <h2>Create your first account</h2>
        <input
          aria-label="Account name"
          value={required.account.createForm.name}
          onChange={(event) => provided.account.setNewAccountName(event.target.value)}
          placeholder="Account name"
          autoComplete="off"
        />
        <input
          aria-label="Opening balance"
          value={required.account.createForm.openingBalance}
          onChange={(event) => provided.account.setNewAccountOpeningBalance(event.target.value)}
          placeholder="Opening balance (optional)"
          inputMode="decimal"
        />
        <label className="stack">
          Currency
          <select
            aria-label="Currency"
            value={required.account.createForm.currency}
            onChange={(event) => provided.account.setNewAccountCurrency(event.target.value)}
          >
            {required.account.supportedCurrencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={required.account.isCreating}>
          {required.account.isCreating ? 'Creating account...' : 'Create account'}
        </button>
        <button type="button" className="text-button" onClick={provided.imports.openSheet}>
          Import from Mobills
        </button>
      </form>
    );
  }

  const accountSwitcherDisabled =
    required.account.isRefreshing || required.isPostingTransaction || required.account.manage.isSubmitting;

  return (
    <>
      {required.account.createForm.isVisible ? (
        <form
          className="stack"
          onSubmit={provided.account.submitCreateAccount}
          aria-busy={required.account.isCreating}
        >
          <h3>Add account</h3>
          <input
            aria-label="Account name"
            value={required.account.createForm.name}
            onChange={(event) => provided.account.setNewAccountName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <input
            aria-label="Opening balance"
            value={required.account.createForm.openingBalance}
            onChange={(event) => provided.account.setNewAccountOpeningBalance(event.target.value)}
            placeholder="Opening balance (optional)"
            inputMode="decimal"
          />
          <label className="stack">
            Currency
            <select
              aria-label="Currency"
              value={required.account.createForm.currency}
              onChange={(event) => provided.account.setNewAccountCurrency(event.target.value)}
            >
              {required.account.supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <div className="quick-row">
            <button type="submit" disabled={required.account.isCreating}>
              {required.account.isCreating ? 'Creating account...' : 'Create account'}
            </button>
            <button type="button" className="text-button" onClick={provided.account.closeCreateAccountForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="section-gap">
        <AccountSwitcherView
          required={{
            accounts: required.account.accounts,
            selectedAccountId: required.account.selectedAccountId,
            disabled: accountSwitcherDisabled,
          }}
          provided={{
            onSelect: provided.account.selectAccount,
            onAddAccount: provided.account.openCreateAccountForm,
            onManageAccount: provided.account.openManageAccountSheet,
            onImport: provided.imports.openSheet,
          }}
        />
      </section>

      {required.account.selectedAccount ? (
        <section className="summary-card section-gap">
          <h2>{required.account.selectedAccount.name}</h2>
          <p className="summary-label">Net balance</p>
          <div className="summary-amount">
            {formatCurrencyAmount(required.account.balanceAmount, required.account.selectedAccount.currency)}
          </div>
        </section>
      ) : null}
    </>
  );
}
