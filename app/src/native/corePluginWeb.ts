import { WebPlugin } from '@capacitor/core';
import type {
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerListSupportedCurrenciesResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerAddTransactionItemInput,
  LedgerPostDraftTransactionInput,
  LedgerVoidTransactionInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../domain/corePort';
import { CoreAdapterWeb } from '../data/coreAdapterWeb';
import type { CorePlugin } from './corePlugin';

export class CorePluginWeb extends WebPlugin implements CorePlugin {
  private readonly core = new CoreAdapterWeb();

  async doThing(options: { input: string }): Promise<CoreResult> {
    return this.core.doThing(options.input);
  }

  async ledgerOpenAccount(options: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    return this.core.ledgerOpenAccount(options);
  }

  async ledgerListSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return this.core.ledgerListSupportedCurrencies();
  }

  async ledgerRenameAccount(options: LedgerRenameAccountInput): Promise<void> {
    return this.core.ledgerRenameAccount(options);
  }

  async ledgerArchiveAccount(options: LedgerArchiveAccountInput): Promise<void> {
    return this.core.ledgerArchiveAccount(options);
  }

  async ledgerListAccounts(): Promise<LedgerListAccountsResult> {
    return this.core.ledgerListAccounts();
  }

  async ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    return this.core.ledgerGetAccountSummary(options);
  }

  async ledgerRecordExpense(options: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    return this.core.ledgerRecordExpense(options);
  }

  async ledgerRecordIncome(options: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    return this.core.ledgerRecordIncome(options);
  }

  async ledgerRecordTransfer(options: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    return this.core.ledgerRecordTransfer(options);
  }

  async ledgerCreateExpenseDraft(options: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    return this.core.ledgerCreateExpenseDraft(options);
  }

  async ledgerAddTransactionItem(options: LedgerAddTransactionItemInput): Promise<void> {
    return this.core.ledgerAddTransactionItem(options);
  }

  async ledgerPostDraftTransaction(options: LedgerPostDraftTransactionInput): Promise<void> {
    return this.core.ledgerPostDraftTransaction(options);
  }

  async ledgerVoidTransaction(options: LedgerVoidTransactionInput): Promise<void> {
    return this.core.ledgerVoidTransaction(options);
  }

  async ledgerListTransactions(options: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return this.core.ledgerListTransactions(options);
  }
}
