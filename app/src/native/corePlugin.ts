import { registerPlugin } from '@capacitor/core';
import type {
  AllocateBudgetInput,
  GetCategoryBalancesInput,
  GetCategoryBalancesResult,
  GetPeriodReservationsInput,
  GetPeriodReservationsResult,
  SettleReservationInput,
  ClosePeriodInput,
  ExecuteInvestmentInput,
  ExecuteInvestmentResult,
  RecordInvestmentReturnInput,
  RecordInvestmentReturnResult,
  GetInvestmentTransactionsInput,
  GetInvestmentTransactionsResult,
  GetBudgetPeriodInput,
  GetBudgetPeriodResult,
  GetBudgetLinksInput,
  GetBudgetLinksResult,
  ListAccountsResult,
  GetAccountSummaryInput,
  GetAccountSummaryResult,
  ListExpensesInput,
  ListExpensesResult,
  ListTransactionsInput,
  ListTransactionsResult,
  UpdateTransactionInput,
  UpdateTransactionResult,
  DeleteTransactionInput,
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
  CreatePeriodReservationsInput,
  CoreResult,
  CreateBudgetPeriodInput,
  CreateBudgetPeriodResult,
  CreateAccountInput,
  CreateAccountResult,
  PostExpenseInput,
  PostExpenseResult,
  PostIncomeInput,
  PostIncomeResult,
  PostTransferInput,
  PostTransferResult,
} from '../domain/corePort';

export interface CorePlugin {
  doThing(options: { input: string }): Promise<CoreResult>;
  createAccount(options: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(options: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(options: PostTransferInput): Promise<PostTransferResult>;
  postIncome(options: PostIncomeInput): Promise<PostIncomeResult>;
  createBudgetPeriod(options: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult>;
  allocateBudget(options: AllocateBudgetInput): Promise<void>;
  getCategoryBalances(options: GetCategoryBalancesInput): Promise<GetCategoryBalancesResult>;
  createPeriodReservations(options: CreatePeriodReservationsInput): Promise<void>;
  getPeriodReservations(options: GetPeriodReservationsInput): Promise<GetPeriodReservationsResult>;
  settleReservation(options: SettleReservationInput): Promise<void>;
  closePeriod(options: ClosePeriodInput): Promise<void>;
  executeInvestment(options: ExecuteInvestmentInput): Promise<ExecuteInvestmentResult>;
  recordInvestmentReturn(options: RecordInvestmentReturnInput): Promise<RecordInvestmentReturnResult>;
  getInvestmentTransactions(options: GetInvestmentTransactionsInput): Promise<GetInvestmentTransactionsResult>;
  getBudgetPeriod(options: GetBudgetPeriodInput): Promise<GetBudgetPeriodResult>;
  getBudgetLinks(options: GetBudgetLinksInput): Promise<GetBudgetLinksResult>;
  listAccounts(): Promise<ListAccountsResult>;
  getAccountSummary(options: GetAccountSummaryInput): Promise<GetAccountSummaryResult>;
  listExpenses(options: ListExpensesInput): Promise<ListExpensesResult>;
  listTransactions(options: ListTransactionsInput): Promise<ListTransactionsResult>;
  updateTransaction(options: UpdateTransactionInput): Promise<UpdateTransactionResult>;
  deleteTransaction(options: DeleteTransactionInput): Promise<void>;
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
