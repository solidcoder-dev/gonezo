import { describe, expect, it } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import { adaptAnalyticsTagUsageFact } from './analyticsTagUsageFactAdapter';

function item(overrides: Partial<AnalyticsMovementFactItem> = {}): AnalyticsMovementFactItem {
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
    categoryAllocations: [],
    tagIds: ['private-id'],
    tags: [],
    ...overrides,
  };
}

describe('adaptAnalyticsTagUsageFact', () => {
  it.each([
    ['POSTED', 'POSTED'],
    ['EXPECTED', 'EXPECTED'],
    ['SCHEDULED_PROJECTION', 'SCHEDULED'],
  ] as const)('maps %s to %s', (source, expected) => {
    expect(adaptAnalyticsTagUsageFact(item({ source }))).toMatchObject({ source: expected });
  });

  it.each([['income', 'INCOME'], ['expense', 'EXPENSE']] as const)('includes %s as %s', (type, kind) => {
    expect(adaptAnalyticsTagUsageFact(item({ type }))).toMatchObject({ kind });
  });

  it('counts distinct analytical keys and reduces all tag identity to the count', () => {
    const fact = adaptAnalyticsTagUsageFact(item({
      tags: [
        { key: 'tag:private-id', tagId: 'private-id', displayName: 'Trip' },
        { key: 'tag:private-id', tagId: 'private-id', displayName: 'Trip' },
        { key: 'name:other-secret', displayName: 'Private Tag Text' },
      ],
    }));

    expect(fact).toEqual({
      id: 'fact-1/tag-usage', occurredAt: '2026-09-18T10:30:00Z', source: 'POSTED', kind: 'EXPENSE',
      currency: 'EUR', amount: '60.00', tagCount: 2,
    });
    expect(JSON.stringify(fact)).not.toMatch(/tag:|name:|tagId|displayName|private-id|other-secret|Trip|Private Tag Text/);
  });

  it('counts untagged and legacy unresolved references with the same semantics', () => {
    expect(adaptAnalyticsTagUsageFact(item())?.tagCount).toBe(0);
    expect(adaptAnalyticsTagUsageFact(item({ tags: [{ key: 'name:legacy-secret', displayName: 'Old private name' }] }))?.tagCount).toBe(1);
  });

  it('is unaffected by a tag rename or replacing identities at the same count', () => {
    const trip = adaptAnalyticsTagUsageFact(item({ tags: [{ key: 'tag:trip-id', tagId: 'trip-id', displayName: 'Trip' }] }));
    const renamed = adaptAnalyticsTagUsageFact(item({ tags: [{ key: 'tag:trip-id', tagId: 'trip-id', displayName: 'Holiday' }] }));
    const replaced = adaptAnalyticsTagUsageFact(item({ tags: [{ key: 'name:unresolved-new-id', displayName: 'Family' }] }));

    expect(renamed).toEqual(trip);
    expect(replaced).toEqual(trip);
  });

  it.each([
    { label: 'ignored', overrides: { ignored: true } },
    { label: 'transfer in', overrides: { type: 'transfer_in' as const } },
    { label: 'transfer out', overrides: { type: 'transfer_out' as const } },
  ])('omits $label movements', ({ overrides }) => {
    expect(adaptAnalyticsTagUsageFact(item(overrides))).toBeNull();
  });

  it('keeps a zero personal amount and uses an ID derived from the analytics fact ID', () => {
    expect(adaptAnalyticsTagUsageFact(item({ personalAmount: '0' }))).toMatchObject({ id: 'fact-1/tag-usage', amount: '0' });
  });
});
