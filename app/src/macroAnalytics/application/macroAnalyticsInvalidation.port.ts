export type MacroAnalyticsInvalidationPort = Readonly<{
  periodChanged(effectiveAt: string): Promise<void>;
  periodAndFollowingChanged(effectiveAt: string): Promise<void>;
  currentPeriodChanged(): Promise<void>;
  allPeriodsChanged(): Promise<void>;
}>;

export type MacroAnalyticsInvalidationEffect =
  | Readonly<{ kind: 'NONE' }>
  | Readonly<{ kind: 'CURRENT_PERIOD' }>
  | Readonly<{ kind: 'EXACT_PERIOD'; effectiveAt: string }>
  | Readonly<{ kind: 'PERIOD_AND_FOLLOWING'; effectiveAt: string }>
  | Readonly<{ kind: 'ALL_PERIODS' }>;
