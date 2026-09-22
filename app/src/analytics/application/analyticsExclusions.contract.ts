export type AnalyticsSetMovementIgnoredInput =
  | { source: 'posted'; transactionId: string; ignored: boolean; changedAt?: string }
  | { source: 'expected'; expectedMovementId: string; ignored: boolean; changedAt?: string }
  | { source: 'scheduledProjection'; recurringMovementId: string; occurrenceId: string; ignored: boolean; changedAt?: string };
export type AnalyticsListIgnoredMovementsResult = { movementIds: string[] };
