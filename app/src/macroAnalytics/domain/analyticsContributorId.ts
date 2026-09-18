export type AnalyticsContributorId = string & { readonly __analyticsContributorId: unique symbol };

export function createAnalyticsContributorId(value: string): AnalyticsContributorId {
  if (!value.trim()) throw new Error('Analytics contributor ID must not be empty');
  return value as AnalyticsContributorId;
}
