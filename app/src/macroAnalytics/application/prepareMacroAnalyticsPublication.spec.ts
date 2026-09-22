import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { ContributionProfile } from '../domain/contributionProfile';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { FinancialFact } from '../domain/financialFact';
import type { CategoryFact } from '../domain/categoryFact';
import type { AnalyticsContributorIdentityPort } from './analyticsContributorIdentity.port';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
import type { LatestMacroAnalyticsPublicationPort } from './latestMacroAnalyticsPublication.port';
import { prepareMacroAnalyticsPublication } from './prepareMacroAnalyticsPublication';
import { createTagUsageFact } from '../domain/tagUsageFact';
import type { ContributionFactSetSourcePort } from './contributionFactSetSource.port';

type FactQuery = Readonly<{ period: ReturnType<typeof createAnalyticsPeriod>; timeZone: string; currency?: string }>;
type FinancialFactSource = Readonly<{ listFinancialFacts(query: FactQuery): Promise<readonly FinancialFact[]> }>;
type CategoryFactSource = Readonly<{ listCategoryFacts(query: FactQuery): Promise<readonly CategoryFact[]> }>;

const profile: ContributionProfile = { birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' };
const facts = [createFinancialFact({ id: 'private-fact-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '12', currency: 'EUR' })];

function categoriesFor(values: readonly FinancialFact[]): CategoryFact[] {
  return values.flatMap((item): CategoryFact[] => {
    const base = { id: String(item.id), occurredAt: item.occurredAt, source: item.source, currency: item.currency, amount: String(item.amount) };
    if (item.kind === 'INCOME') return [{ ...base, kind: 'INCOME', category: 'GROCERIES' }];
    if (item.kind === 'EXPENSE') return [{ ...base, kind: 'EXPENSE', category: 'GROCERIES' }];
    return [];
  });
}

function snapshotFor(
  financialFacts: FinancialFactSource,
  categoryFacts: CategoryFactSource,
  tagUsageFacts: { listTagUsageFacts: (query: { period: ReturnType<typeof createAnalyticsPeriod>; timeZone: string }) => Promise<readonly ReturnType<typeof createTagUsageFact>[]> },
): ContributionFactSetSourcePort {
  return {
    async readContributionFacts({ period, timeZone }) {
      const query = { period, timeZone };
      const [financial, categories, tags] = await Promise.all([
        financialFacts.listFinancialFacts(query),
        categoryFacts.listCategoryFacts(query),
        tagUsageFacts.listTagUsageFacts(query),
      ]);
      return { financial, categories, recurring: [], sharing: [], merchants: [], tagUsage: tags };
    },
  };
}

function setup(options: { consent?: 'GRANTED' | 'DECLINED' | 'WITHDRAWN' | null; profile?: ContributionProfile | null; facts?: typeof facts } = {}) {
  const identities = new Map<string, ReturnType<typeof createAnalyticsContributorId>>();
  const identity: AnalyticsContributorIdentityPort = {
    get: async (userId) => identities.get(userId) ?? null,
    save: async (userId, contributorId) => { identities.set(userId, contributorId); },
  };
  const publications = new Map<string, Map<string, MacroAnalyticsPublication>>();
  const outbox: MacroAnalyticsOutboxPort = {
    get: async (userId, period) => publications.get(userId)?.get(period.value) ?? null,
    save: async (userId, publication) => {
      const userPublications = publications.get(userId) ?? new Map();
      userPublications.set(publication.period.value, publication);
      publications.set(userId, userPublications);
    },
    remove: async (userId, period) => { publications.get(userId)?.delete(period.value); },
    listPending: async (userId) => [...(publications.get(userId)?.values() ?? [])],
    clear: async (userId) => { publications.delete(userId); },
  };
  const latestPublications = new Map<string, MacroAnalyticsPublication>();
  const latest: LatestMacroAnalyticsPublicationPort = {
    find: async (contributorId, period) => latestPublications.get(`${contributorId}:${period.value}`) ?? null,
    save: async (publication) => { latestPublications.set(`${publication.contributorId}:${publication.period.value}`, publication); },
  };
  const consent: AnalyticsContributionConsentPort = {
    get: vi.fn(async () => options.consent ? createAnalyticsContributionConsent({ userId: 'user-A', status: options.consent, noticeVersion: 1, decidedAt: '2026-09-01T00:00:00Z' }) : null),
    save: vi.fn(async () => {}),
  };
  const profileSource: ContributionProfileSourcePort = { get: vi.fn(async () => options.profile === undefined ? profile : options.profile) };
  const financialFacts: FinancialFactSource = { listFinancialFacts: vi.fn(async () => options.facts ?? facts) };
  const categoryFacts: CategoryFactSource = { listCategoryFacts: vi.fn(async () => categoriesFor(options.facts ?? facts)) };
  const accountBalanceFacts = { listAccountBalanceFacts: vi.fn(async () => []) };
  const tagUsageFacts = { listTagUsageFacts: vi.fn(async () => (await financialFacts.listFinancialFacts({ period: createAnalyticsPeriod('2026-09'), timeZone: 'UTC' })).map((item) => createTagUsageFact({
    id: `${item.id}/tag-usage`, occurredAt: item.occurredAt, source: item.source, kind: item.kind as 'INCOME' | 'EXPENSE',
    currency: item.currency, amount: String(item.amount), tagCount: 0,
  }))) };
  const ports = {
    contribution: { consent, profile: profileSource, accountBalanceFacts, factSet: snapshotFor(financialFacts, categoryFacts, tagUsageFacts) },
    identity,
    generateContributorId: vi.fn(() => createAnalyticsContributorId('opaque-random-id')),
    outbox,
    latest,
  };
  return { ports, identity, outbox, financialFacts, categoryFacts };
}

const input = { userId: 'user-A', period: '2026-09', timeZone: 'Europe/London' };

describe('prepareMacroAnalyticsPublication', () => {
  it('creates stable contributor identity and the initial minimized monthly publication', async () => {
    const state = setup({ consent: 'GRANTED' });
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    const second = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(first.status).toBe('PREPARED');
    if (first.status !== 'PREPARED' || second.status !== 'PREPARED') throw new Error('Expected publications');
    expect(first.publication.revision).toBe(1);
    expect(second.publication).toEqual(first.publication);
    expect(state.ports.generateContributorId).toHaveBeenCalledTimes(1);
    expect(await state.identity.get('user-A')).toBe('opaque-random-id');
    expect(JSON.stringify(first.publication)).not.toMatch(/user-A|private-fact-id|occurredAt|birthYear|movementId|accountId|username|email/);
  });

  it('increments a changed contribution and retains only the latest revision', async () => {
    const state = setup({ consent: 'GRANTED' });
    await prepareMacroAnalyticsPublication(state.ports, input);
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([createFinancialFact({ ...facts[0], amount: '13' })]);
    const changedFact = createFinancialFact({ ...facts[0], amount: '13' });
    vi.mocked(state.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([changedFact]));
    const changed = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(changed.status === 'PREPARED' && changed.publication.revision).toBe(2);
    const unchanged = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(unchanged.status === 'PREPARED' && unchanged.publication.revision).toBe(2);
    const pending = await state.outbox.listPending(input.userId);
    expect(pending).toHaveLength(1);
    expect(pending[0].revision).toBe(2);
  });

  it('continues the revision after the previous publication was processed and removed', async () => {
    const state = setup({ consent: 'GRANTED' });
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    if (first.status !== 'PREPARED') throw new Error('Expected first publication');
    if (first.publication.protocolVersion !== 7) throw new Error('Expected V7 publication');
    await state.ports.latest.save(first.publication);
    await state.outbox.remove(input.userId, first.publication.period);
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([createFinancialFact({ ...facts[0], amount: '13' })]);
    const changedFact = createFinancialFact({ ...facts[0], amount: '13' });
    vi.mocked(state.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([changedFact]));

    const changed = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(changed.status === 'PREPARED' && changed.publication.revision).toBe(2);
  });

  it('replaces the latest V1 publication with the next monotonic V7 revision', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod(input.period);
    await state.ports.latest.save({
      protocolVersion: 1,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 3,
      contribution: {
        schemaVersion: 1,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next.status).toBe('PREPARED');
    if (next.status !== 'PREPARED') throw new Error('Expected publication');
    expect(next.publication).toMatchObject({ protocolVersion: 7, revision: 4, contribution: { schemaVersion: 7 } });
  });

  it('rebuilds a latest V2 revision 4 as V7 revision 5', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod(input.period);
    await state.ports.latest.save({
      protocolVersion: 2,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 4,
      contribution: {
        schemaVersion: 2,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
        categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '12' }] }] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next.status).toBe('PREPARED');
    if (next.status !== 'PREPARED') throw new Error('Expected V7 publication');
    expect(next.publication).toMatchObject({ protocolVersion: 7, revision: 5, contribution: { schemaVersion: 7 } });
  });

  it('rebuilds a latest V3 revision 8 as V7 revision 9', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod(input.period);
    await state.ports.latest.save({
      protocolVersion: 3,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 8,
      contribution: {
        schemaVersion: 3,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
        categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '12' }] }] },
        recurring: { currencies: [] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next.status).toBe('PREPARED');
    if (next.status !== 'PREPARED') throw new Error('Expected V7 publication');
    expect(next.publication).toMatchObject({ protocolVersion: 7, revision: 9, contribution: { schemaVersion: 7 } });
  });

  it('rebuilds a latest V4 revision 4 as V7 revision 5 with the current merchant catalog', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod(input.period);
    await state.ports.latest.save({
      protocolVersion: 4,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 4,
      contribution: {
        schemaVersion: 4,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next.status).toBe('PREPARED');
    if (next.status !== 'PREPARED' || next.publication.protocolVersion !== 7) throw new Error('Expected V7 publication');
    expect(next.publication).toMatchObject({ revision: 5, contribution: { schemaVersion: 7, merchants: { catalogVersion: 1, currencies: [] } } });
  });

  it('upgrades a latest V5 revision monotonically to V7', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod(input.period);
    await state.ports.latest.save({
      protocolVersion: 5,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 11,
      contribution: {
        schemaVersion: 5,
        period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
        merchants: { catalogVersion: 1, currencies: [] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next.status).toBe('PREPARED');
    if (next.status !== 'PREPARED') throw new Error('Expected V7 publication');
    expect(next.publication).toMatchObject({ protocolVersion: 7, revision: 12, contribution: { schemaVersion: 7, balances: { currencies: [] } } });
  });

  it('upgrades a latest V6 revision monotonically to V7', async () => {
    const state = setup({ consent: 'GRANTED' });
    const period = createAnalyticsPeriod('2026-09');
    await state.ports.latest.save({
      protocolVersion: 6,
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period,
      revision: 4,
      contribution: {
        schemaVersion: 6, period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
        merchants: { catalogVersion: 1, currencies: [] }, balances: { currencies: [] },
      },
    });

    const next = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(next).toMatchObject({ status: 'PREPARED', publication: { protocolVersion: 7, revision: 5, contribution: { schemaVersion: 7 } } });
  });

  it('does not create a new revision when the contribution matches the processed publication', async () => {
    const state = setup({ consent: 'GRANTED' });
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    if (first.status !== 'PREPARED') throw new Error('Expected first publication');
    if (first.publication.protocolVersion !== 7) throw new Error('Expected V7 publication');
    await state.ports.latest.save(first.publication);
    await state.outbox.remove(input.userId, first.publication.period);

    const unchanged = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(unchanged).toEqual(first);
    expect(await state.outbox.get(input.userId, first.publication.period)).toBeNull();
  });

  it('uses a newer pending revision as the baseline when the latest processed revision is older', async () => {
    const state = setup({ consent: 'GRANTED' });
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    if (first.status !== 'PREPARED') throw new Error('Expected first publication');
    if (first.publication.protocolVersion !== 7) throw new Error('Expected V7 publication');
    const contribution = first.publication.contribution;
    if (contribution.schemaVersion !== 7) throw new Error('Expected V7 contribution');
    await state.ports.latest.save(first.publication);
    const pendingRevisionTwo = { ...first.publication, revision: 2, contribution: { ...contribution, financial: { currencies: [] } } };
    await state.outbox.save(input.userId, pendingRevisionTwo);
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([createFinancialFact({ ...facts[0], amount: '13' })]);
    const changedFact = createFinancialFact({ ...facts[0], amount: '13' });
    vi.mocked(state.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([changedFact]));

    const changed = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(changed.status === 'PREPARED' && changed.publication.revision).toBe(3);
  });

  it('drops a changed pending publication when rebuilt content matches the processed latest', async () => {
    const state = setup({ consent: 'GRANTED' });
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    if (first.status !== 'PREPARED') throw new Error('Expected first publication');
    if (first.publication.protocolVersion !== 7) throw new Error('Expected V7 publication');
    const contribution = first.publication.contribution;
    if (contribution.schemaVersion !== 7) throw new Error('Expected V7 contribution');
    await state.ports.latest.save(first.publication);
    await state.outbox.save(input.userId, { ...first.publication, revision: 2, contribution: { ...contribution, financial: { currencies: [] } } });

    const unchanged = await prepareMacroAnalyticsPublication(state.ports, input);

    expect(unchanged).toEqual(first);
    expect(await state.outbox.get(input.userId, first.publication.period)).toBeNull();
  });

  it('scopes revisions independently by period and user', async () => {
    const state = setup({ consent: 'GRANTED' });
    await prepareMacroAnalyticsPublication(state.ports, input);
    const october = await prepareMacroAnalyticsPublication(state.ports, { ...input, period: '2026-10' });
    await prepareMacroAnalyticsPublication(state.ports, { ...input, userId: 'user-B' });
    expect(october.status === 'PREPARED' && october.publication.revision).toBe(1);
    expect(await state.outbox.get('user-B', createAnalyticsPeriod('2026-09'))).toMatchObject({ contributorId: 'opaque-random-id', revision: 1 });
    expect(await state.outbox.listPending('user-A')).toHaveLength(2);
  });

  it('creates separate identities for separate authenticated users', async () => {
    const state = setup({ consent: 'GRANTED' });
    const generated = [createAnalyticsContributorId('contributor-A'), createAnalyticsContributorId('contributor-B')];
    state.ports.generateContributorId.mockImplementation(() => generated.shift()!);
    const first = await prepareMacroAnalyticsPublication(state.ports, input);
    const second = await prepareMacroAnalyticsPublication(state.ports, { ...input, userId: 'user-B' });
    expect(first.status === 'PREPARED' && first.publication.contributorId).toBe('contributor-A');
    expect(second.status === 'PREPARED' && second.publication.contributorId).toBe('contributor-B');
  });

  it('recognizes reordered facts as an unchanged contribution', async () => {
    const state = setup({ consent: 'GRANTED' });
    const secondFact = createFinancialFact({ id: 'second-private-id', occurredAt: '2026-09-05T10:00:00Z', source: 'EXPECTED', kind: 'EXPENSE', amount: '20', currency: 'GBP' });
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([...facts, secondFact]);
    vi.mocked(state.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([...facts, secondFact]));
    const original = await prepareMacroAnalyticsPublication(state.ports, input);
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([secondFact, ...facts]);
    vi.mocked(state.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([secondFact, ...facts]));
    const reordered = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(reordered).toEqual(original);
  });

  it('removes only the current period when consent is absent and does not clear on unavailable profile', async () => {
    const state = setup({ consent: 'GRANTED' });
    await prepareMacroAnalyticsPublication(state.ports, input);
    vi.mocked(state.ports.contribution.consent.get).mockResolvedValue(null);
    await expect(prepareMacroAnalyticsPublication(state.ports, input)).resolves.toEqual({ status: 'NOT_ELIGIBLE', reason: 'CONSENT_NOT_GRANTED' });
    expect(await state.outbox.listPending('user-A')).toHaveLength(0);

    const profileMissing = setup({ consent: 'GRANTED' });
    await prepareMacroAnalyticsPublication(profileMissing.ports, input);
    vi.mocked(profileMissing.ports.contribution.profile.get).mockResolvedValue(null);
    expect(await prepareMacroAnalyticsPublication(profileMissing.ports, input)).toEqual({ status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' });
    expect(await profileMissing.outbox.listPending('user-A')).toHaveLength(1);
  });

  it('allows empty financial periods to be published', async () => {
    const state = setup({ consent: 'GRANTED', facts: [] });
    const result = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(result.status === 'PREPARED' && result.publication.contribution.financial.currencies).toEqual([]);
  });
});
