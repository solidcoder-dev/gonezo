import type { AnalyticsTagReference } from '../domain/analyticsTagReference';

export type AnalyticsListMovementFactsInput = {
  fromLocalDate: string;
  toLocalDate: string;
  zoneId: string;
  currency?: string;
  includePlannedMovements?: boolean;
  includeIgnoredMovements?: boolean;
  accountIds?: string[];
  categoryId?: string;
  tagIds?: string[];
};

export type AnalyticsMerchantReference = Readonly<{ key: string; displayName: string }>;

export type AnalyticsSharingSummary = Readonly<{
  participantCount: number;
  settlementParticipantCount: number;
  participantAllocatedAmount: string;
  settlementRequiredAmount: string;
}>;

export type AnalyticsRecurrenceCadence = Readonly<{
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
}>;

export type AnalyticsSchedulingOrigin = Readonly<{
  kind: 'recurring' | 'one_shot';
  recurringMovementId: string;
  occurrenceId?: string;
  cadence?: AnalyticsRecurrenceCadence;
}>;

export type AnalyticsCategoryAllocation = Readonly<{
  categoryId?: string;
  personalAmount: string;
  fullAmount: string;
}>;

export type AnalyticsMovementFactItem = {
  analyticsFactId: string;
  reference:
    | { source: 'posted'; transactionId: string }
    | { source: 'expected'; expectedMovementId: string; recurringMovementId?: string; occurrenceId?: string }
    | { source: 'scheduledProjection'; recurringMovementId: string; occurrenceId: string };
  source: 'POSTED' | 'EXPECTED' | 'SCHEDULED_PROJECTION';
  schedulingOrigin?: AnalyticsSchedulingOrigin;
  effectiveAt: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  currency: string;
  personalAmount: string;
  fullAmount: string;
  sharing?: AnalyticsSharingSummary;
  ignored: boolean;
  categoryId?: string;
  categoryAllocations: readonly AnalyticsCategoryAllocation[];
  tagIds: string[];
  tags: readonly AnalyticsTagReference[];
  merchant?: AnalyticsMerchantReference;
};

export type AnalyticsListMovementFactsResult = { items: AnalyticsMovementFactItem[] };

export type AnalyticsMovementFactsPort = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;
