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
}
