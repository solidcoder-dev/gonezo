import type { AccountsCorePort } from './useAccountsPageModel';
import { AccountSwitcher } from './AccountSwitcher';
import { useAccountsPageModel } from './useAccountsPageModel';
import { TransactionComposer } from '../transactions/TransactionComposer';
import { RecentTransactions } from '../transactions/RecentTransactions';
import { formatCurrencyAmount } from '../formatting';

type Props = {
  core: AccountsCorePort;
};

type ImportRowStatus = 'imported' | 'failed' | 'skipped';
type ImportRowResult = {
  sourceLine: number;
  status: ImportRowStatus;
  errorCode?: string;
  errorMessage?: string;
};

type ImportFailureSummaryItem = {
  code: string;
  label: string;
  count: number;
};

function normalizeImportErrorCode(rawCode?: string): string {
  const code = (rawCode ?? '').trim().toUpperCase();
  if (!code) {
    return 'IMPORT_FAILED';
  }
  if (code.startsWith('ACCOUNT_NOT_FOUND')) {
    return 'ACCOUNT_NOT_FOUND';
  }
  if (code.startsWith('UNSUPPORTED_CURRENCY')) {
    return 'UNSUPPORTED_CURRENCY';
  }
  if (code.startsWith('CATEGORY_AUTOCREATE_DISABLED')) {
    return 'CATEGORY_AUTOCREATE_DISABLED';
  }
  if (code.startsWith('TAG_AUTOCREATE_DISABLED')) {
    return 'TAG_AUTOCREATE_DISABLED';
  }
  return code;
}

function importErrorLabel(code: string): string {
  switch (code) {
    case 'ACCOUNT_NOT_FOUND':
      return 'Missing account';
    case 'UNSUPPORTED_CURRENCY':
      return 'Unsupported currency';
    case 'INVALID_DATE':
      return 'Invalid date';
    case 'INVALID_VALUE':
      return 'Invalid value';
    case 'ZERO_VALUE':
      return 'Zero amount';
    case 'MISSING_ACCOUNT':
      return 'Missing account field';
    case 'CATEGORY_AUTOCREATE_DISABLED':
      return 'Category missing (auto-create off)';
    case 'TAG_AUTOCREATE_DISABLED':
      return 'Tag missing (auto-create off)';
    case 'CATEGORY_NOT_FOUND':
      return 'Category not found';
    case 'CATEGORY_ARCHIVED':
      return 'Category archived';
    case 'CATEGORY_APPLIES_TO_MISMATCH':
      return 'Category type mismatch';
    case 'TAG_ARCHIVED':
      return 'Tag archived';
    default:
      return code
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
  }
}

function summarizeImportFailures(rows: ImportRowResult[]): ImportFailureSummaryItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== 'failed') {
      continue;
    }
    const normalizedCode = normalizeImportErrorCode(row.errorCode);
    counts.set(normalizedCode, (counts.get(normalizedCode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([code, count]) => ({
      code,
      label: importErrorLabel(code),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function AccountsPage({ core }: Props) {
  const model = useAccountsPageModel(core);
  const importRows = (model.importResult?.rows ?? []) as ImportRowResult[];
  const importFailedRows = importRows.filter((row) => row.status === 'failed');
  const importFailureSummary = summarizeImportFailures(importRows);
  const accountNotFoundFailures = importFailureSummary.find((item) => item.code === 'ACCOUNT_NOT_FOUND')?.count ?? 0;

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
          <button type="button" className="text-button" onClick={model.openImportSheet}>
            Import from Mobills
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
              onImport={model.openImportSheet}
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

      {model.importSheetOpen ? (
        <div className="sheet-backdrop" role="presentation" onClick={model.closeImportSheet}>
          <section
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Import from Mobills"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="inline-header">
              <h3>Import from Mobills</h3>
              <button
                type="button"
                className="text-button icon-button"
                aria-label="Close import sheet"
                onClick={model.closeImportSheet}
              >
                ×
              </button>
            </div>

            {model.importError ? (
              <div className="banner error" role="alert">
                {model.importError}
              </div>
            ) : null}

            <form className="stack" onSubmit={model.submitMobillsImport} aria-busy={model.importingMobills}>
              <label className="stack">
                Mobills file (TSV/CSV)
                <input
                  aria-label="Mobills file (TSV/CSV)"
                  type="file"
                  accept=".csv,text/csv,.tsv,.txt,text/tab-separated-values"
                  onChange={(event) => model.setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {model.importFileName ? <p className="hint">Selected: {model.importFileName}</p> : null}

              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={model.importCreateMissingAccounts}
                  onChange={(event) => model.setImportCreateMissingAccounts(event.target.checked)}
                />
                Create missing accounts
              </label>
              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={model.importCreateMissingCategories}
                  onChange={(event) => model.setImportCreateMissingCategories(event.target.checked)}
                />
                Create missing categories
              </label>
              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={model.importCreateMissingTags}
                  onChange={(event) => model.setImportCreateMissingTags(event.target.checked)}
                />
                Create missing tags
              </label>

              <label className="stack">
                Account type for auto-created accounts
                <select
                  aria-label="Account type for auto-created accounts"
                  value={model.importDefaultAccountType}
                  onChange={(event) =>
                    model.setImportDefaultAccountType(event.target.value as 'cash' | 'checking' | 'savings' | 'credit')
                  }
                >
                  <option value="cash">cash</option>
                  <option value="checking">checking</option>
                  <option value="savings">savings</option>
                  <option value="credit">credit</option>
                </select>
              </label>

              <button type="submit" disabled={model.importingMobills}>
                {model.importingMobills ? 'Importing...' : 'Import file'}
              </button>
            </form>

            {model.importResult ? (
              <section className="stack section-gap" aria-label="Import summary">
                <p>
                  Imported {model.importResult.importedCount} / {model.importResult.totalRows} rows
                </p>
                <p>{model.importResult.failedCount} failed</p>
                <p>{model.importResult.skippedCount} skipped</p>
                {model.importResult.importedCount > 0 && model.accounts.length === 0 ? (
                  <p className="hint">
                    Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
                    If this persists, share the failed-line examples below.
                  </p>
                ) : null}
                {importFailureSummary.length > 0 ? (
                  <>
                    <p>Failure reasons</p>
                    <ul>
                      {importFailureSummary.slice(0, 6).map((item) => (
                        <li key={item.code}>
                          {item.label}: {item.count}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {accountNotFoundFailures > 0 ? (
                  <p className="hint">
                    Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
                    again.
                  </p>
                ) : null}
                {importFailedRows.length > 0 ? (
                  <>
                    <p>Failed line examples</p>
                    <ul>
                      {importFailedRows.slice(0, 10).map((row) => (
                        <li key={`${row.sourceLine}-${row.errorCode ?? 'IMPORT_FAILED'}`}>
                          Line {row.sourceLine} ({normalizeImportErrorCode(row.errorCode)}): {row.errorMessage ?? 'Import failed'}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
