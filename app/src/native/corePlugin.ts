import { registerPlugin } from '@capacitor/core';
import type {
  CoreResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerRenameAccountInput,
  LedgerArchiveAccountInput,
  LedgerListAccountsResult,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerAddTransactionItemInput,
  LedgerPostDraftTransactionInput,
  LedgerVoidTransactionInput,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../domain/corePort';

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
  ledgerOpenAccount(options: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerRenameAccount(options: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(options: LedgerArchiveAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(options: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(options: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(options: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerCreateExpenseDraft(options: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(options: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(options: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(options: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(options: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
