import type { AccountsCorePort } from './useAccountsPageModel';
import { AccountSwitcher } from './AccountSwitcher';
import { useAccountsPageModel } from './useAccountsPageModel';
import { TransactionComposer } from '../transactions/TransactionComposer';
import { RecentTransactions } from '../transactions/RecentTransactions';

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
          <span>{model.toastMessage}</span>
          {model.canPostAgain ? (
            <button type="button" className="text-button" onClick={model.postAgain}>
              Post again
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={model.clearToast}>
            Dismiss
          </button>
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
                {model.balanceAmount} {model.selectedAccount.currency}
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
            accountLabel={model.selectedAccount?.name ?? 'Unknown account'}
            accountCurrency={model.selectedAccount?.currency ?? '---'}
            showStepSettings={model.showStepSettings}
            isEditing={false}
            stepSize={model.stepSize}
            onChangeType={model.selectTransactionType}
            onSetAmount={model.setTransactionAmount}
            onFormatAmount={model.formatAmount}
            onChangeDate={model.setTransactionDate}
            onChangeCounterparty={model.setCounterparty}
            onToday={model.setToday}
            onYesterday={model.setYesterday}
            onToggleStepSettings={model.toggleStepSettings}
            onChangeStepSize={model.setStepSize}
            onCancelEdit={() => undefined}
            onRollUnits={model.applyStepUnits}
            onSubmit={model.submitTransaction}
          />

          <RecentTransactions
            items={model.visibleTransactions}
            hiddenCount={model.hiddenTransactionsCount}
            expanded={model.historyExpanded}
            disabled={model.postingTransaction || model.refreshing}
            onViewAll={model.expandHistory}
            onVoid={model.voidTransaction}
          />
        </>
      )}
    </section>
  );
}
