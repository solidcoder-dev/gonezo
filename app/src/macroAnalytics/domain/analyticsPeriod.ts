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

export function accountBalanceCutoffForPeriod(period: AnalyticsPeriod): string {
  const [year, month] = period.value.split('-').map(Number);
  const cutoff = new Date(0);
  cutoff.setUTCFullYear(year, month, 1);
  return cutoff.toISOString().slice(0, 10);
}

export function analyticsPeriodForFact(fact: FinancialFact, timeZone: string): AnalyticsPeriod {
  return analyticsPeriodForInstant(fact.occurredAt, timeZone);
}

export function analyticsPeriodForInstant(instant: string, timeZone: string): AnalyticsPeriod {
  if (/^\d{4}-\d{2}-\d{2}$/.test(instant)) return createAnalyticsPeriod(instant.slice(0, 7));
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(instant));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  if (!year || !month) throw new Error('Unable to derive analytics period');
  return createAnalyticsPeriod(`${year.padStart(4, '0')}-${month}`);
}
