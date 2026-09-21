export type SubscriptionCandidateFact = Readonly<{
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  schedulingOrigin?: Readonly<{
    kind: 'recurring' | 'one_shot';
    cadence?: Readonly<{ frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval: number }>;
  }>;
  merchant?: Readonly<{ key: string; displayName: string }>;
  categoryId?: string;
  tagIds?: readonly string[];
}>;

export type SubscriptionCandidateClassification =
  | { status: 'CANDIDATE'; frequency: 'weekly' | 'monthly' | 'yearly'; interval: number }
  | { status: 'NOT_CANDIDATE'; reason: 'MERCHANT_REQUIRED' | 'DAILY_CADENCE' }
  | { status: 'UNKNOWN'; reason: 'CADENCE_UNAVAILABLE' };

export function classifySubscriptionCandidate(
  fact: SubscriptionCandidateFact,
): SubscriptionCandidateClassification | undefined {
  if (fact.schedulingOrigin?.kind !== 'recurring' || fact.type !== 'expense') return undefined;

  const cadence = fact.schedulingOrigin.cadence;
  if (!cadence) return { status: 'UNKNOWN', reason: 'CADENCE_UNAVAILABLE' };
  if (!fact.merchant) return { status: 'NOT_CANDIDATE', reason: 'MERCHANT_REQUIRED' };
  if (cadence.frequency === 'daily') return { status: 'NOT_CANDIDATE', reason: 'DAILY_CADENCE' };
  return { status: 'CANDIDATE', frequency: cadence.frequency, interval: cadence.interval };
}
