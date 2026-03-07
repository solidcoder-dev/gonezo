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

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
  createAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
  postExpense(input: PostExpenseInput): Promise<PostExpenseResult>;
  postTransfer(input: PostTransferInput): Promise<PostTransferResult>;
}
