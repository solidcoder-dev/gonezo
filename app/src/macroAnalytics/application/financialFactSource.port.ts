import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { FinancialFact } from '../domain/financialFact';

export type FinancialFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type FinancialFactSourcePort = Readonly<{
  listFinancialFacts(query: FinancialFactQuery): Promise<readonly FinancialFact[]>;
}>;
