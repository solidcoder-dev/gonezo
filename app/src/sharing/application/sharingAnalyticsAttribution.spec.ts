import { describe, expect, it } from 'vitest';
import { resolveSharingAnalyticsAttribution } from './sharingAnalyticsAttribution';

describe('sharing analytics attribution', () => {
  it('keeps settlement attribution when a participant is settled', () => {
    expect(resolveSharingAnalyticsAttribution('100.00', [
      { amount: '0.10', requiresSettlement: true },
      { amount: '29.90', requiresSettlement: true },
      { amount: '10.00', requiresSettlement: false },
    ])).toEqual({
      participantCount: 3,
      settlementParticipantCount: 2,
      participantAllocatedAmount: '40',
      settlementRequiredAmount: '30',
      personalAmount: '70',
    });
  });

  it('counts zero allocations without treating them as settlement participants', () => {
    expect(resolveSharingAnalyticsAttribution('1.00', [{ amount: '0.00', requiresSettlement: false }])).toMatchObject({
      participantCount: 1,
      settlementParticipantCount: 0,
      participantAllocatedAmount: '0',
      personalAmount: '1',
    });
  });
});
