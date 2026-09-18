import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from './analyticsContributorId';
import { canonicalMacroAnalyticsContribution } from './canonicalMacroAnalyticsContribution';
import { createMacroAnalyticsPublication } from './macroAnalyticsPublication';
import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';

const contribution: MacroAnalyticsContribution = {
  schemaVersion: 1,
  period: { kind: 'YEAR_MONTH', value: '2026-09' },
  dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
  financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '1200', count: 1 }] }] },
};

describe('macro analytics publication', () => {
  it('uses a separate protocol version and validates publication invariants', () => {
    expect(createMacroAnalyticsPublication({ contributorId: createAnalyticsContributorId('random-id'), period: contribution.period, revision: 1, contribution }))
      .toEqual({ protocolVersion: 1, contributorId: 'random-id', period: contribution.period, revision: 1, contribution });
    expect(() => createMacroAnalyticsPublication({ contributorId: createAnalyticsContributorId('id'), period: contribution.period, revision: 0, contribution })).toThrow();
    expect(() => createMacroAnalyticsPublication({ contributorId: createAnalyticsContributorId('id'), period: { kind: 'YEAR_MONTH', value: '2026-10' }, revision: 1, contribution })).toThrow();
  });

  it('canonicalizes structurally equal contribution data independent of array order', () => {
    const reordered: MacroAnalyticsContribution = {
      ...contribution,
      financial: { currencies: [...contribution.financial.currencies].reverse() },
      dimensions: { ...contribution.dimensions },
    };
    expect(canonicalMacroAnalyticsContribution(reordered)).toBe(canonicalMacroAnalyticsContribution(contribution));
  });
});
