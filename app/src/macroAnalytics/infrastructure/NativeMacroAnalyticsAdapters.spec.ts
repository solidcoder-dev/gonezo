import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { NativeAnalyticsContributorIdentityAdapter, NativeMacroAnalyticsOutboxAdapter } from './NativeMacroAnalyticsAdapters';
import { NativeLatestMacroAnalyticsPublicationAdapter } from './NativeLatestMacroAnalyticsPublicationAdapter';

const { identities, publications, latest } = vi.hoisted(() => ({
  identities: new Map<string, string>(),
  publications: new Map<string, Map<string, unknown>>(),
  latest: new Map<string, unknown>(),
}));

vi.mock('./macroAnalyticsLocalStoragePlugin', () => ({
  MacroAnalyticsLocalStorageNativePlugin: {
    getContributorId: vi.fn(async ({ userId }: { userId: string }) => ({ contributorId: identities.get(userId) })),
    saveContributorId: vi.fn(async ({ userId, contributorId }: { userId: string; contributorId: string }) => { identities.set(userId, contributorId); }),
    getPublication: vi.fn(async ({ userId, period }: { userId: string; period: string }) => ({ publication: publications.get(userId)?.get(period) })),
    savePublication: vi.fn(async ({ userId, publication }: { userId: string; publication: { period: { value: string } } }) => {
      const userPublications = publications.get(userId) ?? new Map<string, unknown>();
      userPublications.set(publication.period.value, publication);
      publications.set(userId, userPublications);
    }),
    removePublication: vi.fn(async ({ userId, period }: { userId: string; period: string }) => { publications.get(userId)?.delete(period); }),
    listPublications: vi.fn(async ({ userId }: { userId: string }) => ({ publications: [...(publications.get(userId)?.values() ?? [])] })),
    clearPublications: vi.fn(async ({ userId }: { userId: string }) => { publications.delete(userId); }),
    getLatestPublication: vi.fn(async ({ contributorId, period }: { contributorId: string; period: string }) => ({ publication: latest.get(`${contributorId}:${period}`) })),
    saveLatestPublication: vi.fn(async ({ publication }: { publication: { contributorId: string; period: { value: string } } }) => { latest.set(`${publication.contributorId}:${publication.period.value}`, publication); }),
  },
}));

describe('native macro analytics adapters', () => {
  beforeEach(() => {
    identities.clear();
    publications.clear();
    latest.clear();
  });

  it('retains contributor identity and pending publication across adapter reconstruction', async () => {
    const contributorId = createAnalyticsContributorId('opaque-random-id');
    const period = createAnalyticsPeriod('2026-09');
    const contribution = {
      schemaVersion: 1 as const,
      period,
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
      financial: { currencies: [] },
    };
    const publication = createMacroAnalyticsPublication({ contributorId, period, revision: 1, contribution });
    await new NativeAnalyticsContributorIdentityAdapter().save('user-A', contributorId);
    await new NativeMacroAnalyticsOutboxAdapter().save('user-A', publication);
    await new NativeLatestMacroAnalyticsPublicationAdapter().save(publication);

    await expect(new NativeAnalyticsContributorIdentityAdapter().get('user-A')).resolves.toBe(contributorId);
    await expect(new NativeMacroAnalyticsOutboxAdapter().get('user-A', period)).resolves.toEqual(publication);
    await expect(new NativeLatestMacroAnalyticsPublicationAdapter().find(contributorId, period)).resolves.toEqual(publication);
  });
});
