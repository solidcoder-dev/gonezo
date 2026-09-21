export type FinancialDataChangeObserver = Readonly<{
  periodChanged(effectiveAt: string): Promise<void>;
  periodAndFollowingChanged(effectiveAt: string): Promise<void>;
  currentPeriodChanged(): Promise<void>;
  allPeriodsChanged(): Promise<void>;
}>;
