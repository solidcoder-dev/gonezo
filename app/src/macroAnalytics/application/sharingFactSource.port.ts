import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { SharingFact } from '../domain/sharingFact';

export type SharingFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export type SharingFactSourcePort = Readonly<{
  listSharingFacts(query: SharingFactQuery): Promise<readonly SharingFact[]>;
}>;
