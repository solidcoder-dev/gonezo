export type MacroAnalyticsInvalidationPort = Readonly<{
  invalidate(effect: MacroAnalyticsInvalidationEffect): Promise<void>;
}>;

export type MacroAnalyticsInvalidationEffect =
  | Readonly<{ kind: 'NONE' }>
  | Readonly<{ kind: 'CURRENT_PERIOD' }>
  | Readonly<{ kind: 'EXACT_PERIOD'; effectiveAt: string }>
  | Readonly<{ kind: 'PERIOD_AND_FOLLOWING'; effectiveAt: string }>
  | Readonly<{ kind: 'ALL_PERIODS' }>;
