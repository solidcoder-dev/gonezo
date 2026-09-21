import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MerchantFact } from '../domain/merchantFact';

export type MerchantFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type MerchantFactSourcePort = Readonly<{
  listMerchantFacts(query: MerchantFactQuery): Promise<readonly MerchantFact[]>;
}>;
