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

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  createAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(input: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(input: PostTransferInput): Promise<PostTransferResult>;
  postIncome(input: PostIncomeInput): Promise<PostIncomeResult>;
  createBudgetPeriod(input: CreateBudgetPeriodInput): Promise<CreateBudgetPeriodResult>;
  allocateBudget(input: AllocateBudgetInput): Promise<void>;
}
