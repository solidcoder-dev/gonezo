export const financialFactSources = ['POSTED', 'EXPECTED', 'SCHEDULED'] as const;
export type FinancialFactSource = (typeof financialFactSources)[number];

export const financialFactKinds = ['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT'] as const;
export type FinancialFactKind = (typeof financialFactKinds)[number];

export type FinancialFactId = string & { readonly __financialFactId: unique symbol };
export type DecimalAmount = string & { readonly __decimalAmount: unique symbol };

export type FinancialFact = Readonly<{
  id: FinancialFactId;
  occurredAt: string;
  source: FinancialFactSource;
  kind: FinancialFactKind;
  amount: DecimalAmount;
  currency: string;
  category?: string;
}>;

export type FinancialFactInput = Readonly<{
  id: string;
  occurredAt: string;
  source: FinancialFactSource;
  kind: FinancialFactKind;
  amount: string;
  currency: string;
  category?: string;
}>;

const zonedInstantPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidZonedInstant(value: string): boolean {
  const match = zonedInstantPattern.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
    && hour <= 23 && minute <= 59 && second <= 59;
}

export function createFinancialFact(input: FinancialFactInput): FinancialFact {
  if (!input.id.trim()) throw new Error('Financial fact id is required');
  if (!isValidZonedInstant(input.occurredAt)) throw new Error('Financial fact occurredAt must be a valid timezone-qualified instant');
  if (!(financialFactSources as readonly string[]).includes(input.source)) throw new Error('Unsupported financial fact source');
  if (!(financialFactKinds as readonly string[]).includes(input.kind)) throw new Error('Unsupported financial fact kind');
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.amount) || /^0(?:\.0+)?$/.test(input.amount)) {
    throw new Error('Financial fact amount must be a positive decimal string');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Financial fact currency must be an uppercase three-letter code');
  if (input.category !== undefined && !input.category.trim()) throw new Error('Financial fact category cannot be empty');

  return Object.freeze({
    id: input.id as FinancialFactId,
    occurredAt: input.occurredAt,
    source: input.source,
    kind: input.kind,
    amount: input.amount as DecimalAmount,
    currency: input.currency,
    ...(input.category === undefined ? {} : { category: input.category }),
  });
}
