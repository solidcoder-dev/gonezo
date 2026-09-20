import { describe, expect, it } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { adaptAnalyticsMovementFact } from './analyticsMovementFactAdapter';

function sourceFact(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
  return {
    analyticsFactId: 'fact-1',
    reference: { source: 'posted', transactionId: 'transaction-1' },
    source: 'POSTED',
    effectiveAt: '2026-09-18T10:30:00Z',
    accountId: 'account-1',
    type: 'expense',
    currency: 'EUR',
    personalAmount: '60.00',
    fullAmount: '100.00',
    ignored: false,
    categoryId: 'user-category-1',
    categoryAllocations: [],
    tagIds: ['tag-1'],
    ...overrides,
  };
}

describe('adaptAnalyticsMovementFact', () => {
  it.each([
    ['POSTED', 'POSTED'],
    ['EXPECTED', 'EXPECTED'],
    ['SCHEDULED_PROJECTION', 'SCHEDULED'],
  ] as const)('maps source %s to %s', (source, expected) => {
    expect(adaptAnalyticsMovementFact(sourceFact({ source }))).toMatchObject({ source: expected });
  });

  it.each([
    ['income', 'INCOME'],
    ['expense', 'EXPENSE'],
    ['transfer_in', 'TRANSFER_IN'],
    ['transfer_out', 'TRANSFER_OUT'],
  ] as const)('maps type %s to %s', (type, expected) => {
    expect(adaptAnalyticsMovementFact(sourceFact({ type }))).toMatchObject({ kind: expected });
  });

  it('uses the personal amount and excludes source-only details', () => {
    const fact = adaptAnalyticsMovementFact(sourceFact());

    expect(fact).toEqual({
      id: 'fact-1',
      occurredAt: '2026-09-18T10:30:00Z',
      source: 'POSTED',
      kind: 'EXPENSE',
      amount: '60.00',
      currency: 'EUR',
    });
    expect(fact).not.toHaveProperty('category');
    for (const key of [
      'reference', 'transactionId', 'expectedMovementId', 'recurringMovementId', 'occurrenceId',
      'accountId', 'tagIds', 'fullAmount', 'ignored', 'categoryId',
    ]) {
      expect(fact).not.toHaveProperty(key);
    }
  });

  it('excludes ignored source facts', () => {
    expect(adaptAnalyticsMovementFact(sourceFact({ ignored: true }))).toBeNull();
  });
});
