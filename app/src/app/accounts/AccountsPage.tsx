import type { AccountsCorePort } from './useAccountsPageModel';
import { AccountSwitcher } from './AccountSwitcher';
import { useAccountsPageModel } from './useAccountsPageModel';
import { TransactionComposer } from '../transactions/TransactionComposer';
import { RecentTransactions } from '../transactions/RecentTransactions';
import { formatCurrencyAmount } from '../formatting';

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
          {model.toastActionLabel ? (
            <button type="button" className="text-button" onClick={model.runToastAction}>
              {model.toastActionLabel}
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
            aria-label="Opening balance"
            value={model.newAccountOpeningBalance}
            onChange={(event) => model.setNewAccountOpeningBalance(event.target.value)}
            placeholder="Opening balance (optional)"
            inputMode="decimal"
          />
          <label className="stack">
            Currency
            <select
              aria-label="Currency"
              value={model.newAccountCurrency}
              onChange={(event) => model.setNewAccountCurrency(event.target.value)}
            >
              {model.supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={model.creatingAccount}>
            {model.creatingAccount ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      ) : (
        <>
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
                aria-label="Opening balance"
                value={model.newAccountOpeningBalance}
                onChange={(event) => model.setNewAccountOpeningBalance(event.target.value)}
                placeholder="Opening balance (optional)"
                inputMode="decimal"
              />
              <label className="stack">
                Currency
                <select
                  aria-label="Currency"
                  value={model.newAccountCurrency}
                  onChange={(event) => model.setNewAccountCurrency(event.target.value)}
                >
                  {model.supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
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

          <section className="section-gap">
            <AccountSwitcher
              accounts={model.accounts}
              selectedAccountId={model.selectedAccountId}
              disabled={model.refreshing || model.postingTransaction}
              onSelect={model.selectAccount}
              onAddAccount={model.openCreateAccountForm}
            />
          </section>

          {model.selectedAccount ? (
            <section className="summary-card section-gap">
              <h2>{model.selectedAccount.name}</h2>
              <p className="summary-label">Net balance</p>
              <div className="summary-amount">{formatCurrencyAmount(model.balanceAmount, model.selectedAccount.currency)}</div>
            </section>
          ) : null}

          <TransactionComposer
            open={model.composerOpen}
            mode={model.composerMode}
            onOpen={model.openTransactionComposer}
            onClose={model.closeTransactionComposer}
            onSelectMode={model.selectComposerMode}
            onToggleAdvanced={model.toggleComposerAdvanced}
            advancedOpen={model.composerAdvancedOpen}
            amount={model.transactionAmount}
            date={model.transactionDate}
            note={model.transactionNote}
            categoryInput={model.transactionCategoryInput}
            categoryOptions={model.categoryOptions}
            tagInput={model.transactionTagInput}
            tagOptions={model.tagOptions}
            transferTargetAccountId={model.transferToAccountId}
            transferTargetOptions={model.transferTargetOptions}
            expenseDetailed={model.expenseDetailed}
            expenseItems={model.expenseItems}
            expenseItemName={model.expenseItemName}
            expenseItemAmount={model.expenseItemAmount}
            expenseRemaining={model.expenseRemaining}
            currencyCode={model.selectedAccount?.currency}
            expenseItemNameError={model.expenseItemNameError}
            expenseItemAmountError={model.expenseItemAmountError}
            expenseSplitError={model.expenseSplitError}
            onToggleExpenseDetailed={() => model.setExpenseDetailed(!model.expenseDetailed)}
            onSetExpenseItemName={model.setExpenseItemName}
            onSetExpenseItemAmount={model.setExpenseItemAmount}
            onAddExpenseItem={model.addExpenseItem}
            onRemoveExpenseItem={model.removeExpenseItem}
            onAssignRemaining={model.assignRemaining}
            amountError={model.fieldErrors.amount}
            dateError={model.fieldErrors.date}
            disabled={model.postingTransaction || model.refreshing}
            onSetAmount={model.setTransactionAmount}
            onSetDate={model.setTransactionDate}
            onSetNote={model.setTransactionNote}
            onSetCategoryInput={model.setTransactionCategoryInput}
            onSetTagInput={model.setTransactionTagInput}
            onSetTransferTarget={model.setTransferToAccountId}
            onSubmit={model.submitTransaction}
          />

          <RecentTransactions
            items={model.visibleTransactions}
            hiddenCount={model.hiddenTransactionsCount}
            expanded={model.historyExpanded}
            disabled={model.postingTransaction || model.refreshing}
            pendingVoidTransactionId={model.pendingVoidTransactionId}
            onViewAll={model.expandHistory}
            onVoid={model.voidTransaction}
          />
        </>
      )}
    </section>
  );
}
