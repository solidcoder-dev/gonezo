import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { LatestMacroAnalyticsPublicationPort } from './latestMacroAnalyticsPublication.port';
import { LocalMacroAnalyticsPublicationProcessor } from './LocalMacroAnalyticsPublicationProcessor';

const period = createAnalyticsPeriod('2026-09');
const contributorId = createAnalyticsContributorId('analytics-1');
const contribution: MacroAnalyticsContribution = {
  schemaVersion: 1,
  period,
  dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
  financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '1200', count: 1 }] }] },
};

function publication(revision: number, value = contribution): MacroAnalyticsPublication {
  return createMacroAnalyticsPublication({ contributorId, period, revision, contribution: value });
}

function state(initial: MacroAnalyticsPublication | null = null) {
  let current = initial;
  const latest: LatestMacroAnalyticsPublicationPort = {
    async find() { return current; },
    async save(value) { current = value; },
  };
  return { latest, current: () => current };
}

describe('LocalMacroAnalyticsPublicationProcessor', () => {
  it('accepts and persists the first publication', async () => {
    const store = state();
    await expect(new LocalMacroAnalyticsPublicationProcessor(store.latest).process(publication(1))).resolves.toBe('ACCEPTED');
    expect(store.current()).toEqual(publication(1));
  });

  it('updates newer revisions and identifies equal, stale, and conflicting revisions', async () => {
    const store = state(publication(2));
    const processor = new LocalMacroAnalyticsPublicationProcessor(store.latest);
    await expect(processor.process(publication(2))).resolves.toBe('ALREADY_CURRENT');
    await expect(processor.process(publication(1))).resolves.toBe('STALE');
    const changed = { ...contribution, dimensions: { ...contribution.dimensions, countryCode: 'IE' } };
    await expect(processor.process(publication(2, changed))).resolves.toBe('REVISION_CONFLICT');
    await expect(processor.process(publication(3))).resolves.toBe('UPDATED');
    expect(store.current()?.revision).toBe(3);
  });

  it('updates a processed V1 publication to the next V2 revision', async () => {
    const store = state(publication(3));
    const v2Contribution: MacroAnalyticsContribution = {
      ...contribution,
      schemaVersion: 2,
      categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '1200' }] }] },
    };
    const v2Publication = publication(4, v2Contribution);

    await expect(new LocalMacroAnalyticsPublicationProcessor(store.latest).process(v2Publication)).resolves.toBe('UPDATED');
    expect(store.current()).toEqual(v2Publication);
  });
});
import { describe, expect, it } from 'vitest';
