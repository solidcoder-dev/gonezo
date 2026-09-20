import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import type { SharingFactQuery } from '../application/sharingFactSource.port';
import { createAnalyticsSharingFactSource } from './analyticsSharingFactSource';

const fact = (overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem => ({
  analyticsFactId: 'occurrence/one',
  reference: { source: 'scheduledProjection', recurringMovementId: 'series', occurrenceId: 'occurrence' },
  source: 'SCHEDULED_PROJECTION',
  effectiveAt: '2026-07-01T00:00:00Z',
  accountId: 'account',
  type: 'expense',
  currency: 'EUR',
  personalAmount: '0',
  fullAmount: '30.00',
  ignored: false,
  categoryAllocations: [],
  tagIds: [],
  sharing: {
    participantCount: 1,
    settlementParticipantCount: 1,
    participantAllocatedAmount: '30.00',
    settlementRequiredAmount: '30.00',
  },
  ...overrides,
});

const query: SharingFactQuery = { period: { value: '2026-07' } as SharingFactQuery['period'], timeZone: 'UTC', currency: 'EUR' };

describe('Analytics SharingFact source', () => {
  it('maps scheduled sharing facts with deterministic privacy-safe identity', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [fact()] }));
    const source = createAnalyticsSharingFactSource({ analyticsListMovementFacts });

    const result = await source.listSharingFacts(query);

    expect(result).toEqual([{
      id: 'occurrence/one/sharing',
      occurredAt: '2026-07-01T00:00:00Z',
      source: 'SCHEDULED',
      kind: 'EXPENSE',
      currency: 'EUR',
      fullAmount: '30.00',
      personalAmount: '0',
      participantAllocatedAmount: '30.00',
      settlementRequiredAmount: '30.00',
      participantCount: 1,
      settlementParticipantCount: 1,
    }]);
    expect(JSON.stringify(result)).not.toMatch(/personId|participantId|displayName|payer|shareId|group|expectedMovementId|recurringMovementId/);
    expect(analyticsListMovementFacts).toHaveBeenCalledWith(expect.objectContaining({ includePlannedMovements: true, includeIgnoredMovements: false }));
  });

  it('omits ignored, unshared, and transfer movements', async () => {
    const source = createAnalyticsSharingFactSource({ analyticsListMovementFacts: vi.fn(async () => ({ items: [
      fact({ ignored: true }),
      fact({ sharing: undefined }),
      fact({ type: 'transfer_out' }),
    ] })) });

    await expect(source.listSharingFacts(query)).resolves.toEqual([]);
  });

  it('keeps posted income as a valid SharingFact', async () => {
    const source = createAnalyticsSharingFactSource({ analyticsListMovementFacts: vi.fn(async () => ({ items: [fact({
      analyticsFactId: 'posted/income',
      reference: { source: 'posted', transactionId: 'transaction' },
      source: 'POSTED',
      type: 'income',
      personalAmount: '70.00',
      fullAmount: '100.00',
      sharing: { participantCount: 1, settlementParticipantCount: 1, participantAllocatedAmount: '30.00', settlementRequiredAmount: '30.00' },
    })] })) });

    await expect(source.listSharingFacts(query)).resolves.toMatchObject([{ id: 'posted/income/sharing', source: 'POSTED', kind: 'INCOME' }]);
  });
});
