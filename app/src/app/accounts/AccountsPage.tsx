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
        <p>Loading accounts...</p>
      </section>
    );
  }

  return (
    <section className="card">
      {model.error ? (
        <div className="banner error" role="alert">
          {model.error}
        </div>
      ) : null}
      {model.toastMessage ? (
        <div className="toast" role="status" aria-live="polite">
          {model.toastMessage}
        </div>
      ) : null}

      {model.accounts.length === 0 ? (
        <form className="stack section-gap" onSubmit={model.submitCreateAccount} aria-busy={model.creatingAccount}>
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
            onAddAccount={model.openCreateAccountForm}
          />

          {model.showCreateAccountForm ? (
            <form className="stack" onSubmit={model.submitCreateAccount} aria-busy={model.creatingAccount}>
              <h3>Add account</h3>
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
              <div className="quick-row">
                <button type="submit" disabled={model.creatingAccount}>
                  {model.creatingAccount ? 'Creating account...' : 'Create account'}
                </button>
                <button type="button" className="text-button" onClick={model.closeCreateAccountForm}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

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
            amountError={model.fieldErrors.amount}
            dateError={model.fieldErrors.date}
            disabled={model.postingTransaction || model.refreshing}
            hasLastAmount={Boolean(model.lastTransactionAmount)}
            accountLabel={model.selectedAccount?.name ?? 'Unknown account'}
            accountCurrency={model.selectedAccount?.currency ?? '---'}
            onChangeType={model.setTransactionType}
            onChangeAmount={model.setTransactionAmount}
            onChangeDate={model.setTransactionDate}
            onChangeCounterparty={model.setCounterparty}
            onQuickAmount={model.applyAmountDelta}
            onUseLastAmount={model.useLastAmount}
            onToday={model.setToday}
            onYesterday={model.setYesterday}
            onSubmit={model.submitTransaction}
          />

          <RecentExpensesPreview
            items={model.visibleExpenses}
            hiddenCount={model.hiddenExpensesCount}
            expanded={model.historyExpanded}
            onViewAll={model.expandHistory}
          />
        </>
      )}
    </section>
  );
}
