import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { RecurringFact } from '../domain/recurringFact';

export type RecurringFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type RecurringFactSourcePort = Readonly<{
  listRecurringFacts(query: RecurringFactQuery): Promise<readonly RecurringFact[]>;
}>;
