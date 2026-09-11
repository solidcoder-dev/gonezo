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

  it('preserves transfer directions and native amounts in the analytics read model', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({
      items: [
        {
          analyticsFactId: 'posted/transfer-out',
          reference: { source: 'posted' as const, transactionId: 'transfer-out' },
          source: 'POSTED' as const,
          effectiveAt: '2026-07-01T00:00:00Z',
          accountId: 'account-eur',
          type: 'transfer_out' as const,
          currency: 'EUR',
          personalAmount: '500.00',
          fullAmount: '500.00',
          ignored: false,
          tagIds: [],
        },
        {
          analyticsFactId: 'posted/transfer-in',
          reference: { source: 'posted' as const, transactionId: 'transfer-in' },
          source: 'POSTED' as const,
          effectiveAt: '2026-07-01T00:00:00Z',
          accountId: 'account-usd',
          type: 'transfer_in' as const,
          currency: 'USD',
          personalAmount: '580.00',
          fullAmount: '580.00',
          ignored: false,
          tagIds: [],
        },
      ],
    }));
    const port = {
      ledgerListAccounts: vi.fn(async () => ({ items: [
        { id: 'account-eur', name: 'EUR', type: 'cash', currency: 'EUR', status: 'active' },
        { id: 'account-usd', name: 'USD', type: 'cash', currency: 'USD', status: 'active' },
      ] })),
      ledgerListTransactions: vi.fn(),
      sharingListMovementDetails: vi.fn(),
      analyticsListMovementFacts,
    };

    const result = await listAnalyticsMovements(port, {
      accountIds: ['account-usd'],
      filters: {
        fromDate: '2026-07-01T00:00:00.000Z',
        toDateExclusive: '2026-08-01T00:00:00.000Z',
        currency: 'USD',
      },
    });

    expect(result.transactions.find((transaction) => transaction.id === 'transfer-in')).toEqual(expect.objectContaining({
      id: 'transfer-in',
      type: 'transfer_in',
      amount: '580.00',
      currency: 'USD',
      analyticsAmount: '580.00',
    }));
  });
});
