export type SubscriptionCandidateUsageStatus = 'CANDIDATE' | 'NOT_CANDIDATE' | 'UNKNOWN';
export type SubscriptionCandidateUsageSource = 'POSTED' | 'EXPECTED' | 'SCHEDULED';

export type SubscriptionCandidateUsageFact = Readonly<{
  id: string;
  occurredAt: string;
  source: SubscriptionCandidateUsageSource;
  currency: string;
  amount: string;
  status: SubscriptionCandidateUsageStatus;
}>;

export function createSubscriptionCandidateUsageFact(input: SubscriptionCandidateUsageFact): SubscriptionCandidateUsageFact {
  if (!input.id.trim()) throw new Error('Subscription candidate usage fact id is required');
  if (!Number.isFinite(Date.parse(input.occurredAt)) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.occurredAt)) {
    throw new Error('Subscription candidate usage fact occurredAt must be a timezone-qualified instant');
  }
  if (!(['POSTED', 'EXPECTED', 'SCHEDULED'] as readonly string[]).includes(input.source)) throw new Error('Unsupported subscription candidate usage source');
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.amount)) throw new Error('Subscription candidate usage amount must be a non-negative decimal string');
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Subscription candidate usage currency must be an uppercase three-letter code');
  if (!(['CANDIDATE', 'NOT_CANDIDATE', 'UNKNOWN'] as readonly string[]).includes(input.status)) throw new Error('Unsupported subscription candidate usage status');

  return Object.freeze({
    id: input.id,
    occurredAt: input.occurredAt,
    source: input.source,
    currency: input.currency,
    amount: input.amount,
    status: input.status,
  });
}
