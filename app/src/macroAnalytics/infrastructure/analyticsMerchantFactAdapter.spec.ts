import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createMacroMerchantCode } from '../domain/macroMerchantCode';
import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import { adaptAnalyticsMerchantFact } from './analyticsMerchantFactAdapter';

function item(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'posted/movement-1',
    reference: { source: 'posted', transactionId: 'private-transaction' },
    source: 'POSTED',
    effectiveAt: '2026-09-18T10:30:00Z',
    accountId: 'private-account',
    type: 'expense',
    currency: 'EUR',
    personalAmount: '60.00',
    fullAmount: '100.00',
    ignored: false,
    categoryAllocations: [],
    tagIds: [],
    merchant: { key: 'mercadona', displayName: 'Private Merchant Name' },
    ...overrides,
  };
}

const resolver: CanonicalMerchantResolverPort = {
  resolve: ({ merchantKey }) => merchantKey === 'mercadona' ? createMacroMerchantCode('MERCADONA') : null,
};

describe('adaptAnalyticsMerchantFact', () => {
  it.each([
    ['POSTED', 'POSTED'],
    ['EXPECTED', 'EXPECTED'],
    ['SCHEDULED_PROJECTION', 'SCHEDULED'],
  ] as const)('maps %s source to %s with the deterministic fact id', (source, expected) => {
    expect(adaptAnalyticsMerchantFact(item({ source }), resolver)).toEqual({
      id: 'posted/movement-1/merchant',
      occurredAt: '2026-09-18T10:30:00Z',
      source: expected,
      kind: 'EXPENSE',
      currency: 'EUR',
      amount: '60.00',
      merchant: 'MERCADONA',
    });
  });

  it.each([
    ['income', 'INCOME'],
    ['expense', 'EXPENSE'],
  ] as const)('maps %s to %s', (type, kind) => {
    expect(adaptAnalyticsMerchantFact(item({ type }), resolver)).toMatchObject({ kind });
  });

  it('maps unknown explicit merchants to UNMAPPED without retaining private fields', () => {
    const fact = adaptAnalyticsMerchantFact(item({ merchant: { key: 'unknown private key', displayName: 'Private Merchant Name' } }), resolver);
    expect(fact?.merchant).toBe('UNMAPPED');
    expect(JSON.stringify(fact)).not.toMatch(/unknown private key|Private Merchant Name|private-account|private-transaction/);
  });

  it.each([
    ['no merchant', { merchant: undefined }],
    ['ignored merchant', { ignored: true }],
    ['transfer in', { type: 'transfer_in' }],
    ['transfer out', { type: 'transfer_out' }],
  ] as const)('omits %s', (_label, overrides) => {
    expect(adaptAnalyticsMerchantFact(item(overrides), resolver)).toBeNull();
  });

  it('passes only the normalized analytical key to the resolver', () => {
    const resolve = vi.fn(() => createMacroMerchantCode('MERCADONA'));
    adaptAnalyticsMerchantFact(item(), { resolve });
    expect(resolve).toHaveBeenCalledExactlyOnceWith({ merchantKey: 'mercadona' });
  });
});
