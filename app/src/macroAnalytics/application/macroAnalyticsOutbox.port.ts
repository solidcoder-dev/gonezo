import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';

export type MacroAnalyticsOutboxPort = Readonly<{
  get(userId: string, period: AnalyticsPeriod): Promise<MacroAnalyticsPublication | null>;
  save(userId: string, publication: MacroAnalyticsPublication): Promise<void>;
  remove(userId: string, period: AnalyticsPeriod): Promise<void>;
  listPending(userId: string): Promise<readonly MacroAnalyticsPublication[]>;
  clear(userId: string): Promise<void>;
}>;
