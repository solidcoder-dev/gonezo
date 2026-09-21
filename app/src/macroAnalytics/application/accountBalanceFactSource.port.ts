import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AccountBalanceFact } from '../domain/accountBalanceFact';

export type AccountBalanceFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type AccountBalanceFactSourcePort = Readonly<{
  listAccountBalanceFacts(query: AccountBalanceFactQuery): Promise<readonly AccountBalanceFact[]>;
}>;
