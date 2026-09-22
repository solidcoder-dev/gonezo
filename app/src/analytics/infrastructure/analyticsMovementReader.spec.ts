import { describe, expect, it, vi } from 'vitest';
import { listAnalyticsMovements } from './analyticsMovementReader';

describe('analytics movement bridge contract', () => {
  it('derives the same merchant reference from native facts and web ledger rows', async () => {
    const accounts = { items: [{ id: 'account', name: 'Main', type: 'cash' as const, currency: 'EUR', status: 'active' }] };
    const native = await listAnalyticsMovements({
      ledgerListAccounts: vi.fn(async () => accounts),
      ledgerListTransactions: vi.fn(),
      sharingListMovementDetails: vi.fn(),
      analyticsListMovementFacts: vi.fn(async () => ({ items: [{
        analyticsFactId: 'posted/native', reference: { source: 'posted' as const, transactionId: 'native' },
        source: 'POSTED' as const,
        schedulingOrigin: { kind: 'recurring' as const, recurringMovementId: 'private-series', cadence: { frequency: 'monthly' as const, interval: 1 } },
        effectiveAt: '2026-07-01T00:00:00Z', accountId: 'account', type: 'expense' as const,
        currency: 'EUR', personalAmount: '10.00', fullAmount: '10.00', ignored: false,
        categoryAllocations: [], tagIds: [], tags: [], merchant: { key: 'el nino', displayName: 'El Niño' },
      }] })),
    }, { filters: { fromDate: '2026-07-01', toDate: '2026-07-31' } });
    const web = await listAnalyticsMovements({
      ledgerListAccounts: vi.fn(async () => accounts),
      ledgerListTransactions: vi.fn(async () => ({ content: [{
        id: 'web', accountId: 'account', type: 'expense' as const, status: 'posted' as const,
        amount: '10.00', currency: 'EUR', occurredAt: '2026-07-01T00:00:00Z', merchant: 'El Niño', items: [],
      }], page: 0, size: 100, totalElements: 1, totalPages: 1, hasNext: false, hasPrevious: false })),
      sharingListMovementDetails: vi.fn(async () => ({ items: [] })),
    }, { filters: {} });

    expect(native.transactions[0].merchantReference).toEqual({ key: 'el nino', displayName: 'El Niño' });
    expect(web.transactions[0].merchantReference).toEqual(native.transactions[0].merchantReference);
  });

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
        schedulingOrigin: {
          kind: 'recurring' as const,
          recurringMovementId: '00000000-0000-4000-8000-000000000002',
          occurrenceId: '00000000-0000-4000-8000-000000000001',
          cadence: { frequency: 'weekly' as const, interval: 2 },
        },
        effectiveAt: '2026-07-01T00:00:00Z',
        accountId: '00000000-0000-4000-8000-000000000003',
        type: 'expense' as const,
        currency: 'EUR',
        personalAmount: '12.00',
        fullAmount: '12.00',
        sharing: {
          participantCount: 1,
          settlementParticipantCount: 1,
          participantAllocatedAmount: '12.00',
          settlementRequiredAmount: '12.00',
        },
        ignored: false,
        categoryAllocations: [],
        tagIds: ['tag-home'],
        tags: [{ key: 'tag:tag-home', tagId: 'tag-home', displayName: 'Home' }],
      }],
    }));
    const port = {
      ledgerListAccounts: vi.fn(async () => ({ items: [{ id: '00000000-0000-4000-8000-000000000003', name: 'Main', type: 'cash' as const, currency: 'EUR', status: 'active' }] })),
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
    expect(result.transactions[0].schedulingOrigin).toEqual({
      kind: 'recurring',
      recurringMovementId: '00000000-0000-4000-8000-000000000002',
      occurrenceId: '00000000-0000-4000-8000-000000000001',
      cadence: { frequency: 'weekly', interval: 2 },
    });
    expect(result.transactions[0].sharing).toEqual({
      participantCount: 1,
      settlementParticipantCount: 1,
      participantAllocatedAmount: '12.00',
      settlementRequiredAmount: '12.00',
    });
    expect(result.transactions[0].analyticsTags).toEqual([
      { key: 'tag:tag-home', tagId: 'tag-home', displayName: 'Home' },
    ]);
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
          categoryAllocations: [],
          tagIds: [],
          tags: [],
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
          categoryAllocations: [],
          tagIds: [],
          tags: [],
        },
      ],
    }));
    const port = {
      ledgerListAccounts: vi.fn(async () => ({ items: [
        { id: 'account-eur', name: 'EUR', type: 'cash' as const, currency: 'EUR', status: 'active' },
        { id: 'account-usd', name: 'USD', type: 'cash' as const, currency: 'USD', status: 'active' },
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
