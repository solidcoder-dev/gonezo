export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type RecurrenceMonthlyPattern = 'day_of_month' | 'nth_weekday';

export type RecurrenceRuleInput = {
  frequency: RecurrenceFrequency;
  interval?: number;
  weeklyDays?: number[];
  monthlyPattern?: RecurrenceMonthlyPattern;
  dayOfMonth?: number;
  monthlyWeekOrdinal?: number;
  monthlyWeekday?: number;
};

export type RecurrenceEndInput =
  | {
    kind: 'never';
  }
  | {
    kind: 'on_date';
    onDate: string;
  }
  | {
    kind: 'after_occurrences';
    afterOccurrences: number;
  };

export type RecurrenceCreateRecurringMovementInput = {
  type: 'expense' | 'income' | 'transfer';
  sourceAccountId: string;
  targetAccountId?: string;
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  splitItems?: Array<{ id: string; name: string; amount: string }>;
  tagIds?: string[];
  tagNames?: string[];
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
  startAt: string;
  zoneId: string;
};

export type RecurrenceCreateRecurringMovementResult = {
  id: string;
};

export type RecurrenceDeactivateRecurringMovementInput = {
  recurringMovementId: string;
  deactivatedAt?: string;
};

export type RecurrenceListRecurringMovementsInput = {
  sourceAccountId: string;
};

export type RecurrenceMovementItem = {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  sourceAccountId: string;
  targetAccountId?: string;
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
  description?: string;
  merchant?: string;
  status: 'active' | 'deactivated' | 'completed';
  startAt: string;
  nextDueAt?: string;
  zoneId: string;
  generatedOccurrences: number;
  splitItems: Array<{ id: string; name: string; amount: string }>;
  rule: RecurrenceRuleInput;
  recurrenceEnd: RecurrenceEndInput;
};

export type RecurrenceListRecurringMovementsResult = {
  items: RecurrenceMovementItem[];
};

export type SchedulingFrequency = RecurrenceFrequency;

export type SchedulingMonthlyPattern = RecurrenceMonthlyPattern;

export type SchedulingRuleInput = RecurrenceRuleInput;

export type SchedulingEndInput = RecurrenceEndInput;

export type SchedulingCreateMovementInput = RecurrenceCreateRecurringMovementInput & {
  scheduleKind?: 'recurring' | 'one_shot';
};

export type SchedulingCreateMovementResult = RecurrenceCreateRecurringMovementResult;

export type SchedulingUpdateMovementInput = SchedulingCreateMovementInput & {
  recurringMovementId: string;
};

export type SchedulingUpdateMovementResult = RecurrenceCreateRecurringMovementResult;

export type SchedulingDeactivateMovementInput = RecurrenceDeactivateRecurringMovementInput;

export type SchedulingListMovementsInput = RecurrenceListRecurringMovementsInput;

export type SchedulingMovementItem = RecurrenceMovementItem & {
  categoryId?: string;
  tagIds?: string[];
  tagNames?: string[];
  scheduleKind?: 'recurring' | 'one_shot';
  origin?: 'recurring' | 'one_shot';
};

export type SchedulingListMovementsResult = {
  items: SchedulingMovementItem[];
};

export interface RecurrencePort {
  recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
}

export interface SchedulingPort {
  schedulingCreateMovement(input: SchedulingCreateMovementInput): Promise<SchedulingCreateMovementResult>;
  schedulingUpdateMovement(input: SchedulingUpdateMovementInput): Promise<SchedulingUpdateMovementResult>;
  schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void>;
  schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult>;
}
