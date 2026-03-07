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
}

export const CorePlugin = registerPlugin<CorePlugin>('CorePlugin', {
  web: () => import('./corePluginWeb').then((m) => new m.CorePluginWeb()),
});
