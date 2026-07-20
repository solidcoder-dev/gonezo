import type { AccountsListBalancesResult } from '../../account/application/accountBalances.port';
import type {
  LedgerAddTransactionItemInput,
  LedgerArchiveAccountInput,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerDeleteAccountInput,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
  LedgerGetNetWorthByCurrencyResult,
  LedgerListAccountsResult,
  LedgerListSupportedCurrenciesResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerPostDraftTransactionInput,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerRenameAccountInput,
  LedgerRestoreAccountInput,
  LedgerVoidTransactionInput,
} from '../../ledger/application/ledger.port';
import { getNativeCashFlowSeries } from '../../ledger/infrastructure/nativeCashFlowSeries';
import { listAccountBalances } from './accountBalancesQuery';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class LedgerRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  accountsListBalances(): Promise<AccountsListBalancesResult> {
    return isNativeRuntime() ? listAccountBalances(CorePlugin) : this.web.accountsListBalances();
  }

  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    return isNativeRuntime() ? CorePlugin.ledgerOpenAccount(input) : this.web.ledgerOpenAccount(input);
  }

  ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return isNativeRuntime() ? CorePlugin.ledgerListSupportedCurrencies() : this.web.ledgerListSupportedCurrencies();
  }

  async ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerRenameAccount(input);
      return;
    }
    await this.web.ledgerRenameAccount(input);
  }

  async ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerArchiveAccount(input);
      return;
    }
    await this.web.ledgerArchiveAccount(input);
  }

  async ledgerRestoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerRestoreAccount(input);
      return;
    }
    await this.web.ledgerRestoreAccount(input);
  }

  async ledgerDeleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerDeleteAccount(input);
      return;
    }
    await this.web.ledgerDeleteAccount(input);
  }

  ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return isNativeRuntime() ? CorePlugin.ledgerListAccounts() : this.web.ledgerListAccounts();
  }

  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    return isNativeRuntime() ? CorePlugin.ledgerGetAccountSummary(input) : this.web.ledgerGetAccountSummary(input);
  }

  ledgerGetNetWorthByCurrency(): Promise<LedgerGetNetWorthByCurrencyResult> {
    return isNativeRuntime() ? CorePlugin.ledgerGetNetWorthByCurrency() : this.web.ledgerGetNetWorthByCurrency();
  }

  ledgerGetCashFlowSeries(input: LedgerGetCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult> {
    return isNativeRuntime() ? getNativeCashFlowSeries(CorePlugin, input) : this.web.ledgerGetCashFlowSeries(input);
  }

  ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    return isNativeRuntime() ? CorePlugin.ledgerRecordExpense(input) : this.web.ledgerRecordExpense(input);
  }

  ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    return isNativeRuntime() ? CorePlugin.ledgerRecordIncome(input) : this.web.ledgerRecordIncome(input);
  }

  ledgerRecordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    return isNativeRuntime() ? CorePlugin.ledgerRecordTransfer(input) : this.web.ledgerRecordTransfer(input);
  }

  ledgerRecordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    return isNativeRuntime() ? CorePlugin.ledgerRecordTransferFx(input) : this.web.ledgerRecordTransferFx(input);
  }

  ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    return isNativeRuntime() ? CorePlugin.ledgerCreateExpenseDraft(input) : this.web.ledgerCreateExpenseDraft(input);
  }

  async ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerAddTransactionItem(input);
      return;
    }
    await this.web.ledgerAddTransactionItem(input);
  }

  async ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerPostDraftTransaction(input);
      return;
    }
    await this.web.ledgerPostDraftTransaction(input);
  }

  async ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.ledgerVoidTransaction(input);
      return;
    }
    await this.web.ledgerVoidTransaction(input);
  }

  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return isNativeRuntime() ? CorePlugin.ledgerListTransactions(input) : this.web.ledgerListTransactions(input);
  }
}
