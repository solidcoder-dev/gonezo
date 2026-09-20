import { describe, expect, it } from 'vitest';
import { createSharingFact } from './sharingFact';

const validFact = {
  id: 'fact/sharing',
  occurredAt: '2026-07-01T00:00:00Z',
  source: 'POSTED' as const,
  kind: 'EXPENSE' as const,
  currency: 'EUR',
  fullAmount: '100.00',
  personalAmount: '70.00',
  participantAllocatedAmount: '40.00',
  settlementRequiredAmount: '30.00',
  participantCount: 2,
  settlementParticipantCount: 1,
};

describe('SharingFact', () => {
  it('allows zero personal amount and validates exact attribution arithmetic', () => {
    expect(createSharingFact({ ...validFact, personalAmount: '0', settlementRequiredAmount: '100.00', participantAllocatedAmount: '100.00' }).personalAmount).toBe('0');
    expect(() => createSharingFact({ ...validFact, personalAmount: '69.99' })).toThrow('personalAmount must equal');
  });

  it('rejects allocation totals beyond the movement amount', () => {
    expect(() => createSharingFact({ ...validFact, participantAllocatedAmount: '100.01' })).toThrow('participant amounts exceed');
  });
});
