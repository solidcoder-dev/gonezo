import type { FinancialFact } from './financialFact';

export type AnalyticsPeriod = Readonly<{
  kind: 'YEAR_MONTH';
  value: string;
}>;

export function createAnalyticsPeriod(value: string): AnalyticsPeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) < 1 || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new Error('Analytics period must use a valid YYYY-MM value');
  }

  return Object.freeze({ kind: 'YEAR_MONTH', value });
}

export function analyticsPeriodForFact(fact: FinancialFact, timeZone: string): AnalyticsPeriod {
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(fact.occurredAt));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) throw new Error('Unable to derive analytics period');
  return createAnalyticsPeriod(`${year.padStart(4, '0')}-${month}`);
}
