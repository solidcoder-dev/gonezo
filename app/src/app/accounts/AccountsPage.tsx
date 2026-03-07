import type { AccountsCorePort } from './useAccountsPageModel';
import { AccountSwitcher } from './AccountSwitcher';
import { useAccountsPageModel } from './useAccountsPageModel';
import { TransactionComposer } from '../transactions/TransactionComposer';
import { RecentExpensesPreview } from '../transactions/RecentExpensesPreview';

type Props = {
  core: AccountsCorePort;
};

export function AccountsPage({ core }: Props) {
  const model = useAccountsPageModel(core);

  if (model.loading) {
    return (
      <section className="card">
        <h1>Accounts</h1>
        <p>Loading accounts...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Accounts</h1>
      <p>Summary and quick transaction entry.</p>

      {model.error ? (
        <div className="banner error" role="alert">
          {model.error}
        </div>
      ) : null}
      {model.success ? (
        <div className="banner success" role="status" aria-live="polite">
          {model.success}
        </div>
      ) : null}

      {model.accounts.length === 0 ? (
        <form className="stack section-gap" onSubmit={model.createFirstAccount} aria-busy={model.creatingAccount}>
          <h2>Create your first account</h2>
          <input
            aria-label="Account name"
            value={model.newAccountName}
            onChange={(event) => model.setNewAccountName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <input
            aria-label="Currency"
            value={model.newAccountCurrency}
            onChange={(event) => model.setNewAccountCurrency(event.target.value.toUpperCase())}
            placeholder="Currency (USD)"
            maxLength={3}
            autoCapitalize="characters"
          />
          <button type="submit" disabled={model.creatingAccount}>
            {model.creatingAccount ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      ) : (
        <>
          <AccountSwitcher
            accounts={model.accounts}
            selectedAccountId={model.selectedAccountId}
            disabled={model.refreshing || model.postingTransaction}
            onSelect={model.selectAccount}
          />

          {model.selectedAccount ? (
            <section className="summary-card section-gap">
              <h2>{model.selectedAccount.name}</h2>
              <p className="summary-label">Net balance</p>
              <div className="summary-amount">
                {model.netAmount} {model.selectedAccount.currency}
              </div>
            </section>
          ) : null}

          <TransactionComposer
            transactionType={model.transactionType}
            amount={model.transactionAmount}
            date={model.transactionDate}
            counterparty={model.counterparty}
            disabled={model.postingTransaction || model.refreshing}
            onChangeType={model.setTransactionType}
            onChangeAmount={model.setTransactionAmount}
            onChangeDate={model.setTransactionDate}
            onChangeCounterparty={model.setCounterparty}
            onSubmit={model.submitTransaction}
          />

          <RecentExpensesPreview items={model.recentExpenses} hiddenCount={model.hiddenExpensesCount} />
        </>
      )}
    </section>
  );
}
