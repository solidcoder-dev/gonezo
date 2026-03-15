export type CoreResult = {
  status: 'ok' | 'error';
  message: string;
};

export type CreateAccountInput = {
  name: string;
  userId?: string;
  type?: string;
  currency?: string;
};

export type CreateAccountResult = {
  id: string;
};

export type PostExpenseInput = {
  accountId: string;
  postedDate: string;
  effectiveDate: string;
  amount: string;
  currency: string;
  merchant?: string;
  categoryId?: string;
  recurring?: boolean;
  reservationId?: string;
};

export type PostExpenseResult = {
  id: string;
};

export type PostTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  postedDate: string;
  effectiveDate: string;
  amount: string;
  currency: string;
  fromCategoryId?: string;
  toCategoryId?: string;
};

export type PostTransferResult = {
  ids: string[];
};

export type PostIncomeInput = {
  budgetPlanId: string;
  accountId: string;
  postedDate: string;
  effectiveDate: string;
  amount: string;
  currency: string;
  merchant?: string;
  categoryId?: string;
  recurring?: boolean;
};

export type PostIncomeResult = {
  id: string;
};

export type CreateBudgetPeriodInput = {
  planId: string;
  year: number;
  month: number;
  currency: string;
};

export type CreateBudgetPeriodResult = {
  id: string;
};

export type AllocateBudgetInput = {
  periodId: string;
};

export type GetCategoryBalancesInput = {
  periodId: string;
};

export type CategoryBalanceItem = {
  categoryId: string;
  availableAmount: string;
  currency: string;
  safeToSpendAmount: string;
};

export type GetCategoryBalancesResult = {
  items: CategoryBalanceItem[];
};

export type CreatePeriodReservationsInput = {
  periodId: string;
};

export type GetPeriodReservationsInput = {
  periodId: string;
};

export type ReservationItem = {
  id: string;
  budgetPeriodId: string;
  patternId: string;
  categoryId: string;
  amount: string;
  currency: string;
  status: string;
  expectedEffectiveDate: string;
  linkedTransactionId?: string;
};

export type GetPeriodReservationsResult = {
  items: ReservationItem[];
};

export type SettleReservationInput = {
  reservationId: string;
  transactionId: string;
};

export type ClosePeriodInput = {
  periodId: string;
};

export type ExecuteInvestmentInput = {
  containerId: string;
  date: string;
  type: string;
  assetId?: string;
  quantity?: string;
  amount: string;
  currency: string;
  feesAmount?: string;
  taxesAmount?: string;
  note?: string;
  budgetPeriodId?: string;
  categoryId?: string;
};

export type ExecuteInvestmentResult = {
  id: string;
};

export type RecordInvestmentReturnInput = {
  containerId: string;
  date: string;
  amount: string;
  currency: string;
  note?: string;
};

export type RecordInvestmentReturnResult = {
  id: string;
};

export type GetInvestmentTransactionsInput = {
  containerId: string;
};

export type InvestmentTransactionItem = {
  id: string;
  containerId: string;
  date: string;
  type: string;
  assetId?: string;
  quantity?: string;
  amount: string;
  currency: string;
  feesAmount?: string;
  taxesAmount?: string;
  note?: string;
};

export type GetInvestmentTransactionsResult = {
  items: InvestmentTransactionItem[];
};

export type GetBudgetPeriodInput = {
  periodId: string;
};

export type GetBudgetPeriodResult = {
  id: string;
  budgetPlanId: string;
  year: number;
  month: number;
  incomeTotalAmount: string;
  incomeTotalCurrency: string;
  remainderAmount: string;
  remainderCurrency: string;
};

export type GetBudgetLinksInput = {
  periodId: string;
};

export type BudgetLinkItem = {
  id: string;
  budgetPeriodId: string;
  categoryId: string;
  linkedType: string;
  linkedId: string;
  budgetImpactAmount: string;
  budgetImpactCurrency: string;
};

export type GetBudgetLinksResult = {
  items: BudgetLinkItem[];
};

export type AccountItem = {
  id: string;
  name: string;
  type: string;
  currency: string;
};

export type ListAccountsResult = {
  items: AccountItem[];
};

export type GetAccountSummaryInput = {
  accountId: string;
};

export type GetAccountSummaryResult = {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  netAmount: string;
};

export type ListExpensesInput = {
  accountId: string;
  limit?: number;
};

export type ExpenseItem = {
  id: string;
  postedDate: string;
  merchant?: string;
  amount: string;
  currency: string;
};

export type ListExpensesResult = {
  items: ExpenseItem[];
};

export type ListTransactionsInput = {
  accountId: string;
  limit?: number;
};

export type TransactionItem = {
  id: string;
  postedDate: string;
  merchant?: string;
  amount: string;
  currency: string;
  type: 'income' | 'expense';
};

export type ListTransactionsResult = {
  items: TransactionItem[];
};

export type UpdateTransactionInput = {
  transactionId: string;
  accountId: string;
  postedDate: string;
  amount: string;
  currency: string;
  type: 'income' | 'expense';
  merchant?: string;
};

export type UpdateTransactionResult = {
  id: string;
};

export type DeleteTransactionInput = {
  transactionId: string;
  accountId: string;
};

export type LedgerOpenAccountInput = {
  name: string;
  type?: string;
  currency?: string;
  createdAt?: string;
};

export type LedgerOpenAccountResult = {
  id: string;
};

export type LedgerRenameAccountInput = {
  accountId: string;
  name: string;
};

export type LedgerArchiveAccountInput = {
  accountId: string;
  archivedAt?: string;
};

export type LedgerAccountItem = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: string;
};

export type LedgerListAccountsResult = {
  items: LedgerAccountItem[];
};

export type LedgerGetAccountSummaryInput = {
  accountId: string;
};

export type LedgerGetAccountSummaryResult = {
  accountId: string;
  name: string;
  type: string;
  currency: string;
  balanceAmount: string;
};

export type LedgerRecordExpenseInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerRecordExpenseResult = {
  id: string;
};

export type LedgerRecordIncomeInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerRecordIncomeResult = {
  id: string;
};

export type LedgerCreateExpenseDraftInput = {
  accountId: string;
  occurredAt: string;
  amount: string;
  currency: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
};

export type LedgerCreateExpenseDraftResult = {
  id: string;
};

export type LedgerAddTransactionItemInput = {
  transactionId: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

export type LedgerPostDraftTransactionInput = {
  transactionId: string;
};

export type LedgerVoidTransactionInput = {
  transactionId: string;
};

export type LedgerListTransactionsInput = {
  accountId: string;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  merchant?: string;
  includeVoided?: boolean;
};

export type LedgerTransactionBreakdownItem = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  categoryId?: string;
  note?: string;
};

export type LedgerTransactionListItem = {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'draft' | 'posted' | 'voided';
  amount: string;
  currency: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  items: LedgerTransactionBreakdownItem[];
};

export type LedgerListTransactionsResult = {
  items: LedgerTransactionListItem[];
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  createAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(input: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(input: PostTransferInput): Promise<PostTransferResult>;
  postIncome(input: PostIncomeInput): Promise<PostIncomeResult>;
  createBudgetPeriod(input: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult>;
  allocateBudget(input: AllocateBudgetInput): Promise<void>;
  getCategoryBalances(input: GetCategoryBalancesInput): Promise<GetCategoryBalancesResult>;
  createPeriodReservations(input: CreatePeriodReservationsInput): Promise<void>;
  getPeriodReservations(input: GetPeriodReservationsInput): Promise<GetPeriodReservationsResult>;
  settleReservation(input: SettleReservationInput): Promise<void>;
  closePeriod(input: ClosePeriodInput): Promise<void>;
  executeInvestment(input: ExecuteInvestmentInput): Promise<ExecuteInvestmentResult>;
  recordInvestmentReturn(input: RecordInvestmentReturnInput): Promise<RecordInvestmentReturnResult>;
  getInvestmentTransactions(input: GetInvestmentTransactionsInput): Promise<GetInvestmentTransactionsResult>;
  getBudgetPeriod(input: GetBudgetPeriodInput): Promise<GetBudgetPeriodResult>;
  getBudgetLinks(input: GetBudgetLinksInput): Promise<GetBudgetLinksResult>;
  listAccounts(): Promise<ListAccountsResult>;
  getAccountSummary(input: GetAccountSummaryInput): Promise<GetAccountSummaryResult>;
  listExpenses(input: ListExpensesInput): Promise<ListExpensesResult>;
  listTransactions(input: ListTransactionsInput): Promise<ListTransactionsResult>;
  updateTransaction(input: UpdateTransactionInput): Promise<UpdateTransactionResult>;
  deleteTransaction(input: DeleteTransactionInput): Promise<void>;
  ledgerOpenAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult>;
  ledgerRenameAccount(input: LedgerRenameAccountInput): Promise<void>;
  ledgerArchiveAccount(input: LedgerArchiveAccountInput): Promise<void>;
  ledgerListAccounts(): Promise<LedgerListAccountsResult>;
  ledgerGetAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult>;
  ledgerRecordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult>;
  ledgerRecordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult>;
  ledgerCreateExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult>;
  ledgerAddTransactionItem(input: LedgerAddTransactionItemInput): Promise<void>;
  ledgerPostDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void>;
  ledgerVoidTransaction(input: LedgerVoidTransactionInput): Promise<void>;
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
}
