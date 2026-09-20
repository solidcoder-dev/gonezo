export const recurringFactSources = ['POSTED', 'EXPECTED', 'SCHEDULED'] as const;
export type RecurringFactSource = (typeof recurringFactSources)[number];
export const recurringFactKinds = ['INCOME', 'EXPENSE'] as const;
export type RecurringFactKind = (typeof recurringFactKinds)[number];

export type RecurringFact = Readonly<{
  id: string;
  occurredAt: string;
  source: RecurringFactSource;
  kind: RecurringFactKind;
  currency: string;
  amount: string;
  seriesId: string;
}>;

export function createRecurringFact(input: RecurringFact): RecurringFact {
  if (!input.id.trim()) throw new Error('Recurring fact id is required');
  if (!Number.isFinite(Date.parse(input.occurredAt)) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.occurredAt)) {
    throw new Error('Recurring fact occurredAt must be a timezone-qualified instant');
  }
  if (!(recurringFactSources as readonly string[]).includes(input.source)) throw new Error('Unsupported recurring fact source');
  if (!(recurringFactKinds as readonly string[]).includes(input.kind)) throw new Error('Unsupported recurring fact kind');
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.amount)) {
    throw new Error('Recurring fact amount must be a non-negative decimal string');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Recurring fact currency must be an uppercase three-letter code');
  if (!input.seriesId.trim()) throw new Error('Recurring fact seriesId is required');

  return Object.freeze({ ...input });
}
