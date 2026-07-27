import { describe, expect, it, vi } from 'vitest';
import { listAnalyticsMovements } from './analyticsMovementReader';

describe('analytics movement bridge contract', () => {
  it('sends dates, includeIgnoredMovements and keeps a scheduled reference out of transaction ids', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({
      items: [{
        analyticsFactId: 'occurrence/00000000-0000-4000-8000-000000000001',
        reference: {
          source: 'scheduledProjection' as const,
          recurringMovementId: '00000000-0000-4000-8000-000000000002',
          occurrenceId: '00000000-0000-4000-8000-000000000001',
        },
        source: 'SCHEDULED_PROJECTION' as const,
        effectiveAt: '2026-07-01T00:00:00Z',
        accountId: '00000000-0000-4000-8000-000000000003',
        type: 'expense' as const,
        currency: 'EUR',
        personalAmount: '12.00',
        fullAmount: '12.00',
        ignored: false,
        tagIds: ['tag-home'],
      }],
    }));
    const port = {
      ledgerListAccounts: vi.fn(async () => ({ items: [{ id: '00000000-0000-4000-8000-000000000003', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' }] })),
      ledgerListTransactions: vi.fn(),
      sharingListMovementDetails: vi.fn(),
      analyticsListMovementFacts,
    };

    const result = await listAnalyticsMovements(port, {
      filters: {
        fromDate: '2026-07-01T00:00:00.000Z',
        toDateExclusive: '2026-08-01T00:00:00.000Z',
        currency: 'EUR',
        includePlannedMovements: true,
      },
      includeIgnoredMovements: true,
    });

    expect(analyticsListMovementFacts).toHaveBeenCalledWith(expect.objectContaining({
      fromLocalDate: '2026-07-01',
      toLocalDate: '2026-07-31',
      zoneId: expect.any(String),
      includeIgnoredMovements: true,
    }));
    expect(result.transactions[0].id).toBe('occurrence/00000000-0000-4000-8000-000000000001');
    expect(result.transactions[0].reference).toEqual({
      source: 'scheduledProjection',
      recurringMovementId: '00000000-0000-4000-8000-000000000002',
      occurrenceId: '00000000-0000-4000-8000-000000000001',
    });
  });
});
