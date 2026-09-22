import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import { createAnalyticsContributionPeriodSource } from './analyticsContributionPeriodSource';

const fact = (id: string, effectiveAt: string, ignored = false): AnalyticsMovementFactItem => ({
  analyticsFactId: id,
  reference: { source: 'posted', transactionId: id },
  source: 'POSTED',
  effectiveAt,
  accountId: 'account',
  type: 'expense',
  currency: 'GBP',
  personalAmount: '10',
  fullAmount: '10',
  ignored,
  categoryAllocations: [],
  tagIds: [],
  tags: [],
});

describe('createAnalyticsContributionPeriodSource', () => {
  it('discovers sorted unique fact periods through the requested month using the Analytics fact boundary', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [
      fact('1', '2025-12-31T23:30:00Z'),
      fact('2', '2025-12-10T10:00:00Z'),
      fact('3', '2026-02-01T00:00:00Z'),
      fact('4', '2025-11-01T00:00:00Z', true),
    ] }));
    const source = createAnalyticsContributionPeriodSource({ analyticsListMovementFacts, analyticsGetAccountBalanceCoverage: vi.fn(async () => ({})) });

    await expect(source.listPeriods('Europe/London', { kind: 'YEAR_MONTH', value: '2026-01' })).resolves.toEqual([
      { kind: 'YEAR_MONTH', value: '2025-12' },
    ]);
    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '0001-01-01',
      toLocalDate: '2026-01-31',
      zoneId: 'Europe/London',
      includePlannedMovements: true,
      includeIgnoredMovements: false,
    });
  });

  it('discovers every account-history month even when the movement source is quiet', async () => {
    const source = createAnalyticsContributionPeriodSource({
      analyticsListMovementFacts: vi.fn(async () => ({ items: [] })),
      analyticsGetAccountBalanceCoverage: vi.fn(async () => ({ firstAccountLocalDate: '2026-01-18' })),
    });
    await expect(source.listPeriods('UTC', { kind: 'YEAR_MONTH', value: '2026-03' })).resolves.toEqual([
      { kind: 'YEAR_MONTH', value: '2026-01' },
      { kind: 'YEAR_MONTH', value: '2026-02' },
      { kind: 'YEAR_MONTH', value: '2026-03' },
    ]);
  });
});
