import { describe, expect, it } from 'vitest';
import { aggregateSharingFacts } from './sharingContribution';
import { createSharingFact } from './sharingFact';

function fact(overrides: Partial<Parameters<typeof createSharingFact>[0]> = {}) {
  return createSharingFact({
    id: 'private-movement-id', occurredAt: '2026-09-01T00:00:00Z', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR',
    fullAmount: '10.00', personalAmount: '6.00', participantAllocatedAmount: '4.00', settlementRequiredAmount: '4.00',
    participantCount: 2, settlementParticipantCount: 1, ...overrides,
  });
}

describe('aggregateSharingFacts', () => {
  it('aggregates exact sparse buckets across currencies, sources, and kinds without identities', () => {
    const result = aggregateSharingFacts([
      fact({ id: 'one', fullAmount: '0.10', personalAmount: '0.06', participantAllocatedAmount: '0.04', settlementRequiredAmount: '0.04' }),
      fact({ id: 'two', fullAmount: '0.20', personalAmount: '0.12', participantAllocatedAmount: '0.08', settlementRequiredAmount: '0.08' }),
      fact({ id: 'three', currency: 'USD', source: 'EXPECTED', kind: 'INCOME', fullAmount: '5', personalAmount: '5', participantAllocatedAmount: '0', settlementRequiredAmount: '0', participantCount: 0, settlementParticipantCount: 0 }),
      fact({ id: 'four', source: 'SCHEDULED', fullAmount: '7', personalAmount: '0', participantAllocatedAmount: '7', settlementRequiredAmount: '7' }),
    ]);

    expect(result.currencies.map(({ currency }) => currency)).toEqual(['EUR', 'USD']);
    expect(result.currencies[0].buckets).toEqual([
      { source: 'POSTED', kind: 'EXPENSE', fullAmount: '0.30', personalAmount: '0.18', participantAllocatedAmount: '0.12', settlementRequiredAmount: '0.12', movementCount: 2, participantCount: 4, settlementParticipantCount: 2 },
      { source: 'SCHEDULED', kind: 'EXPENSE', fullAmount: '7', personalAmount: '0', participantAllocatedAmount: '7', settlementRequiredAmount: '7', movementCount: 1, participantCount: 2, settlementParticipantCount: 1 },
    ]);
    expect(result.currencies[1].buckets[0]).toEqual({ source: 'EXPECTED', kind: 'INCOME', fullAmount: '5', personalAmount: '5', participantAllocatedAmount: '0', settlementRequiredAmount: '0', movementCount: 1, participantCount: 0, settlementParticipantCount: 0 });
    expect(JSON.stringify(result)).not.toMatch(/private-movement-id|participantId|personId|shareId/);
  });

  it('returns no currencies for empty input', () => {
    expect(aggregateSharingFacts([])).toEqual({ currencies: [] });
  });
});
