import { ExactDecimal, addExactDecimals } from '../../shared/domain/exactDecimal';
import type { SharingFact } from './sharingFact';

export type SharingContributionBucket = Readonly<{
  source: SharingFact['source'];
  kind: SharingFact['kind'];
  fullAmount: string;
  personalAmount: string;
  participantAllocatedAmount: string;
  settlementRequiredAmount: string;
  movementCount: number;
  participantCount: number;
  settlementParticipantCount: number;
}>;

export type SharingCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly SharingContributionBucket[];
}>;

export type SharingContribution = Readonly<{
  currencies: readonly SharingCurrencyContribution[];
}>;

export function findSharingContributionBucket(
  contribution: SharingContribution,
  currency: string,
  source: SharingFact['source'],
  kind: SharingFact['kind'],
): SharingContributionBucket | undefined {
  return contribution.currencies.find((entry) => entry.currency === currency)?.buckets
    .find((bucket) => bucket.source === source && bucket.kind === kind);
}

const sources: readonly SharingFact['source'][] = ['POSTED', 'EXPECTED', 'SCHEDULED'];
const kinds: readonly SharingFact['kind'][] = ['INCOME', 'EXPENSE'];

export function aggregateSharingFacts(facts: readonly SharingFact[]): SharingContribution {
  const totals = new Map<string, {
    currency: string;
    source: SharingFact['source'];
    kind: SharingFact['kind'];
    fullAmount: string;
    personalAmount: string;
    participantAllocatedAmount: string;
    settlementRequiredAmount: string;
    movementCount: number;
    participantCount: number;
    settlementParticipantCount: number;
  }>();

  for (const fact of facts) {
    const key = JSON.stringify([fact.currency, fact.source, fact.kind]);
    const current = totals.get(key);
    totals.set(key, {
      currency: fact.currency,
      source: fact.source,
      kind: fact.kind,
      fullAmount: addExactDecimals(current?.fullAmount ?? '0', fact.fullAmount),
      personalAmount: addExactDecimals(current?.personalAmount ?? '0', fact.personalAmount),
      participantAllocatedAmount: addExactDecimals(current?.participantAllocatedAmount ?? '0', fact.participantAllocatedAmount),
      settlementRequiredAmount: addExactDecimals(current?.settlementRequiredAmount ?? '0', fact.settlementRequiredAmount),
      movementCount: (current?.movementCount ?? 0) + 1,
      participantCount: (current?.participantCount ?? 0) + fact.participantCount,
      settlementParticipantCount: (current?.settlementParticipantCount ?? 0) + fact.settlementParticipantCount,
    });
  }

  const currencies = [...new Set(facts.map(({ currency }) => currency))].sort();
  return Object.freeze({
    currencies: Object.freeze(currencies.map((currency) => Object.freeze({
      currency,
      buckets: Object.freeze(sources.flatMap((source) => kinds.flatMap((kind) => {
        const bucket = totals.get(JSON.stringify([currency, source, kind]));
        if (!bucket) return [];
        assertBucketInvariants(bucket, currency);
        return [Object.freeze({
          source: bucket.source,
          kind: bucket.kind,
          fullAmount: bucket.fullAmount,
          personalAmount: bucket.personalAmount,
          participantAllocatedAmount: bucket.participantAllocatedAmount,
          settlementRequiredAmount: bucket.settlementRequiredAmount,
          movementCount: bucket.movementCount,
          participantCount: bucket.participantCount,
          settlementParticipantCount: bucket.settlementParticipantCount,
        })];
      }))),
    }))),
  });
}

function assertBucketInvariants(bucket: SharingContributionBucket, currency: string): void {
  const fullAmount = ExactDecimal.from(bucket.fullAmount);
  const personalAmount = ExactDecimal.from(bucket.personalAmount);
  const allocatedAmount = ExactDecimal.from(bucket.participantAllocatedAmount);
  const settlementAmount = ExactDecimal.from(bucket.settlementRequiredAmount);
  if (personalAmount.add(settlementAmount).compare(fullAmount) !== 0
    || settlementAmount.compare(allocatedAmount) > 0
    || allocatedAmount.compare(fullAmount) > 0
    || bucket.settlementParticipantCount > bucket.participantCount) {
    throw new Error(`Sharing contribution invariants failed for ${currency}:${bucket.source}:${bucket.kind}`);
  }
}
