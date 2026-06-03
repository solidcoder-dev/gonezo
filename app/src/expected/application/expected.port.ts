export type ExpectedCreateMovementInput = {
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  originOccurrenceId?: string;
  originRecurringMovementId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
};

export type ExpectedCreateMovementResult = {
  id: string;
};

export type ExpectedUpdateMovementInput = {
  expectedMovementId: string;
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
};

export type ExpectedUpdateMovementResult = {
  id: string;
};

export type ExpectedMovementStatus = 'pending' | 'resolved' | 'dismissed';

export type ExpectedMovementItem = {
  id: string;
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  originOccurrenceId?: string;
  originRecurringMovementId?: string;
  splitItems: Array<{ id: string; name: string; amount: string }>;
  status: ExpectedMovementStatus;
  resolvedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
};

export type ExpectedListMovementsInput = {
  accountId: string;
  includeClosed?: boolean;
};

export type ExpectedListMovementsResult = {
  items: ExpectedMovementItem[];
};

export type ExpectedResolveMovementInput = {
  expectedMovementId: string;
  transactionId: string;
  resolvedAt?: string;
};

export type ExpectedDismissMovementInput = {
  expectedMovementId: string;
  dismissedAt?: string;
};

export interface ExpectedPort {
  expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult>;
  expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult>;
  expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
  expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void>;
  expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void>;
}
