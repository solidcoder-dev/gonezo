import { describe, expect, it } from 'vitest';
import { createWebAppState } from '../../core/infrastructure/webAppState';
import { getWebAccountBalanceSnapshot } from './webAccountBalanceSnapshot';

describe('web account balance snapshots', () => {
  it('includes only accounts and posted transactions before the exclusive cutoff', () => {
    const state = createWebAppState({
      ledgerAccounts: [
        { id: 'active', name: 'Active', type: 'bank', currency: 'EUR', status: 'active', createdAt: '2026-09-01T10:00:00Z' },
        { id: 'archived', name: 'Archived', type: 'card', currency: 'EUR', status: 'archived', createdAt: '2026-09-01T10:00:00Z' },
        { id: 'zero', name: 'Zero', type: 'cash', currency: 'EUR', status: 'active', createdAt: '2026-09-01T10:00:00Z' },
        { id: 'at-cutoff', name: 'At cutoff', type: 'other', currency: 'EUR', status: 'active', createdAt: '2026-09-02T00:00:00Z' },
      ],
      ledgerTransactions: [
        { id: 'before', accountId: 'active', type: 'income', status: 'posted', amount: '10.005', currency: 'EUR', occurredAt: '2026-09-01T12:00:00Z', items: [] },
        { id: 'expense', accountId: 'active', type: 'expense', status: 'posted', amount: '2.005', currency: 'EUR', occurredAt: '2026-09-01T13:00:00Z', items: [] },
        { id: 'at-cutoff', accountId: 'active', type: 'income', status: 'posted', amount: '100', currency: 'EUR', occurredAt: '2026-09-02T00:00:00Z', items: [] },
        { id: 'draft', accountId: 'active', type: 'income', status: 'draft', amount: '100', currency: 'EUR', occurredAt: '2026-09-01T14:00:00Z', items: [] },
        { id: 'voided', accountId: 'active', type: 'income', status: 'voided', amount: '100', currency: 'EUR', occurredAt: '2026-09-01T15:00:00Z', items: [] },
      ],
    });

    expect(getWebAccountBalanceSnapshot(state, { asOfLocalDateExclusive: '2026-09-02', zoneId: 'UTC' })).toMatchObject({
      items: [
        { accountId: 'active', balanceAmount: '8.000' },
        { accountId: 'archived', balanceAmount: '0' },
        { accountId: 'zero', balanceAmount: '0' },
      ],
    });
  });

  it.each([
    ['UTC', '7'],
    ['Europe/Madrid', '0'],
    ['Atlantic/Canary', '7'],
  ])('uses %s local midnight as the cutoff', (zoneId, expected) => {
    const state = createWebAppState({
      ledgerAccounts: [{ id: 'wallet', name: 'Wallet', type: 'wallet', currency: 'EUR', status: 'active', createdAt: '2026-09-01T00:00:00Z' }],
      ledgerTransactions: [{ id: 'midnight', accountId: 'wallet', type: 'income', status: 'posted', amount: '7', currency: 'EUR', occurredAt: '2026-09-01T22:30:00Z', items: [] }],
    });
    expect(getWebAccountBalanceSnapshot(state, { asOfLocalDateExclusive: '2026-09-02', zoneId }).items[0]?.balanceAmount).toBe(expected);
  });

  it('filters normalized currency and sorts currency, type, then account ID', () => {
    const state = createWebAppState({ ledgerAccounts: [
      { id: 'b', name: 'B', type: 'cash', currency: 'USD', status: 'active', createdAt: '2026-09-01T00:00:00Z' },
      { id: 'a', name: 'A', type: 'bank', currency: 'EUR', status: 'active', createdAt: '2026-09-01T00:00:00Z' },
    ] });
    expect(getWebAccountBalanceSnapshot(state, { asOfLocalDateExclusive: '2026-09-02', zoneId: 'UTC', currency: ' eur ' }).items.map(({ accountId }) => accountId)).toEqual(['a']);
    expect(getWebAccountBalanceSnapshot(state, { asOfLocalDateExclusive: '2026-09-02', zoneId: 'UTC' }).items.map(({ accountId }) => accountId)).toEqual(['a', 'b']);
  });
});
