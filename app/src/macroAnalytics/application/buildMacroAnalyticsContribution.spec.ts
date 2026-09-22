import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributionConsent, type AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { ContributionProfile } from '../domain/contributionProfile';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { FinancialFact } from '../domain/financialFact';
import type { CategoryFact } from '../domain/categoryFact';
import type { RecurringFact } from '../domain/recurringFact';
import { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
import type { SharingFact } from '../domain/sharingFact';
import type { MerchantFact } from '../domain/merchantFact';
import type { AccountBalanceFactSourcePort } from './accountBalanceFactSource.port';
import type { TagUsageFact } from '../domain/tagUsageFact';
import { createTagUsageFact } from '../domain/tagUsageFact';
import type { AnalyticsPeriodSnapshotPort } from './analyticsPeriodSnapshot.port';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';

type FactQuery = Readonly<{ period: ReturnType<typeof import('../domain/analyticsPeriod').createAnalyticsPeriod>; timeZone: string; currency?: string }>;
type FinancialFactSource = Readonly<{ listFinancialFacts(query: FactQuery): Promise<readonly FinancialFact[]> }>;
type CategoryFactSource = Readonly<{ listCategoryFacts(query: FactQuery): Promise<readonly CategoryFact[]> }>;
type RecurringFactSource = Readonly<{ listRecurringFacts(query: FactQuery): Promise<readonly RecurringFact[]> }>;
type SharingFactSource = Readonly<{ listSharingFacts(query: FactQuery): Promise<readonly SharingFact[]> }>;
type MerchantFactSource = Readonly<{ listMerchantFacts(query: FactQuery): Promise<readonly MerchantFact[]> }>;
type TagUsageFactSource = Readonly<{ listTagUsageFacts(query: FactQuery): Promise<readonly TagUsageFact[]> }>;

const profile: ContributionProfile = { birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' };
const granted = createAnalyticsContributionConsent({ userId: 'private-user-id', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00Z' });
const fact = createFinancialFact({ id: 'private-fact-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '0.10', currency: 'EUR' });

function categoriesFor(facts: readonly FinancialFact[]): CategoryFact[] {
  return facts.flatMap((item): CategoryFact[] => {
    const base = { id: String(item.id), occurredAt: item.occurredAt, source: item.source, currency: item.currency, amount: String(item.amount) };
    if (item.kind === 'INCOME') return [{ ...base, kind: 'INCOME', category: 'OTHER_INCOME' }];
    if (item.kind === 'EXPENSE') return [{ ...base, kind: 'EXPENSE', category: 'GROCERIES' }];
    return [];
  });
}

function snapshotFromSources(
  financialFacts: FinancialFactSource,
  categoryFacts: CategoryFactSource,
  recurringFacts: RecurringFactSource,
  sharingFacts: SharingFactSource,
  merchantFacts: MerchantFactSource,
  tagUsageFacts: TagUsageFactSource,
): AnalyticsPeriodSnapshotPort {
  return {
    async readPeriodSnapshot({ period, timeZone }) {
      const query = { period, timeZone };
      const [financial, categories, recurring, sharing, merchants, tags] = await Promise.all([
        financialFacts.listFinancialFacts(query),
        categoryFacts.listCategoryFacts(query),
        recurringFacts.listRecurringFacts(query),
        sharingFacts.listSharingFacts(query),
        merchantFacts.listMerchantFacts(query),
        tagUsageFacts.listTagUsageFacts(query),
      ]);
      const financialIds = financial.map((item) => String(item.id));
      const auxiliaryFactId = (id: string) => financialIds.includes(id) || financialIds.length !== 1 ? id : financialIds[0];
      const categoryByFact = new Map<string, CategoryFact[]>(categories.map((item) => [String(item.id), [item]]));
      const recurringByFact = new Map(recurring.map((item) => [auxiliaryFactId(String(item.id).replace(/\/recurring$/, '')), item]));
      const sharingByFact = new Map(sharing.map((item) => [auxiliaryFactId(String(item.id).replace(/\/sharing$/, '')), item]));
      const merchantByFact = new Map(merchants.map((item) => [auxiliaryFactId(String(item.id).replace(/\/merchant$/, '')), item]));
      const tagCountByFact = new Map<string, number>();
      for (const item of tags) {
        const id = auxiliaryFactId(String(item.id).replace(/\/tag-usage$/, ''));
        tagCountByFact.set(id, (tagCountByFact.get(id) ?? 0) + item.tagCount);
      }
      const financialById = new Map(financial.map((item) => [String(item.id), item]));
      const auxiliary = [...recurring, ...sharing, ...merchants, ...tags];
      const ids = new Set([...financialById.keys(), ...auxiliary.map((item) => auxiliaryFactId(String(item.id).replace(/\/(?:recurring|sharing|merchant|tag-usage)$/, '')))]);
      const movements: AnalyticsMovementFactItem[] = [...ids].map((id) => {
        const item = financialById.get(id) ?? (() => {
          const source = auxiliary.find((candidate) => String(candidate.id).replace(/\/(?:recurring|sharing|merchant|tag-usage)$/, '') === id);
          return source && { id, occurredAt: source.occurredAt, source: source.source, kind: source.kind, currency: source.currency, amount: String('amount' in source ? source.amount : 'personalAmount' in source ? source.personalAmount : '0') };
        })();
        if (!item) throw new Error(`Missing test fact ${id}`);
        const recurringFact = recurringByFact.get(id);
        const sharingFact = sharingByFact.get(id);
        const merchantFact = merchantByFact.get(id);
        const tagCount = tagCountByFact.get(id) ?? 0;
        return {
          analyticsFactId: id,
          reference: { source: 'posted', transactionId: id },
          source: item.source === 'SCHEDULED' ? 'SCHEDULED_PROJECTION' : item.source,
          schedulingOrigin: recurringFact ? { kind: 'recurring', recurringMovementId: String(recurringFact.seriesId) } : undefined,
          effectiveAt: item.occurredAt,
          accountId: 'account',
          type: item.kind.toLowerCase() as AnalyticsMovementFactItem['type'],
          currency: item.currency,
          personalAmount: String(item.amount),
          fullAmount: sharingFact ? String(sharingFact.fullAmount) : String(item.amount),
          sharing: sharingFact ? {
            participantCount: sharingFact.participantCount,
            settlementParticipantCount: sharingFact.settlementParticipantCount,
            participantAllocatedAmount: String(sharingFact.participantAllocatedAmount),
            settlementRequiredAmount: String(sharingFact.settlementRequiredAmount),
          } : undefined,
          ignored: false,
          categoryAllocations: (categoryByFact.get(id) ?? []).map((category) => ({ categoryId: category.category, personalAmount: String(category.amount), fullAmount: String(category.amount) })),
          tagIds: [],
          tags: Array.from({ length: tagCount }, (_, index) => ({ key: `${id}-tag-${index}`, displayName: 'Tag' })),
          merchant: merchantFact ? { key: String(merchantFact.merchant), displayName: String(merchantFact.merchant) } : undefined,
        };
      });
      return { period, movements };
    },
  };
}

function sources(consent: AnalyticsContributionConsent | null = granted, contributionProfile: ContributionProfile | null = profile, facts = [fact]) {
  const consentSource: AnalyticsContributionConsentPort = { get: vi.fn(async () => consent), save: vi.fn(async () => {}) };
  const profileSource: ContributionProfileSourcePort = { get: vi.fn(async () => contributionProfile) };
  const factSource: FinancialFactSource = { listFinancialFacts: vi.fn(async () => facts) };
  const categoryFacts: CategoryFactSource = { listCategoryFacts: vi.fn(async () => categoriesFor(facts)) };
  const recurringFacts: RecurringFactSource = { listRecurringFacts: vi.fn(async () => []) };
  const sharingFacts: SharingFactSource = { listSharingFacts: vi.fn(async () => []) };
  const merchantFacts: MerchantFactSource = { listMerchantFacts: vi.fn(async () => []) };
  const accountBalanceFacts: AccountBalanceFactSourcePort = { listAccountBalanceFacts: vi.fn(async () => []) };
  const tagUsageFacts: TagUsageFactSource = { listTagUsageFacts: vi.fn(async () => facts.flatMap((item) => item.kind === 'INCOME' || item.kind === 'EXPENSE' ? [createTagUsageFact({
    id: `${item.id}/tag-usage`, occurredAt: item.occurredAt, source: item.source, kind: item.kind,
    currency: item.currency, amount: String(item.amount), tagCount: 0,
  })] : [])) };
  return { consent: consentSource, profile: profileSource, financialFacts: factSource, categoryFacts, recurringFacts, sharingFacts, merchantFacts, accountBalanceFacts, tagUsageFacts, snapshot: snapshotFromSources(factSource, categoryFacts, recurringFacts, sharingFacts, merchantFacts, tagUsageFacts), merchantResolver: { resolve: ({ merchantKey }: { merchantKey: string }) => merchantKey as never }, profileSource, factSource };
}

describe('buildMacroAnalyticsContribution', () => {
  it('builds a V7 contribution from one movement snapshot read', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [] }));
    const legacy = sources(granted, profile, []);
    const result = await buildMacroAnalyticsContribution({
      consent: legacy.consent,
      profile: legacy.profile,
      accountBalanceFacts: legacy.accountBalanceFacts,
      snapshot: { readPeriodSnapshot: vi.fn(async ({ period }) => { await analyticsListMovementFacts(); return { period, movements: [] }; }) },
      merchantResolver: { resolve: () => null },
    }, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' });

    expect(result.status).toBe('BUILT');
    expect(analyticsListMovementFacts).toHaveBeenCalledTimes(1);
  });

  it.each([null, 'DECLINED', 'WITHDRAWN'] as const)('does not load facts without granted consent (%s)', async (status) => {
    const consent = status === null ? null : createAnalyticsContributionConsent({ ...granted, status });
    const ports = sources(consent);
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .resolves.toEqual({ status: 'NOT_ELIGIBLE', reason: 'CONSENT_NOT_GRANTED' });
    expect(ports.profile.get).not.toHaveBeenCalled();
    expect(ports.financialFacts.listFinancialFacts).not.toHaveBeenCalled();
  });

  it('does not load facts when the required cohort profile is unavailable', async () => {
    const ports = sources(granted, null);
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .resolves.toEqual({ status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' });
    expect(ports.financialFacts.listFinancialFacts).not.toHaveBeenCalled();
  });

  it('treats a profile born after the historical contribution year as unavailable', async () => {
    const ports = sources(granted, { ...profile, birthYear: 2020 });
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2019-06', timeZone: 'Europe/Madrid' }))
      .resolves.toEqual({ status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' });
    expect(ports.financialFacts.listFinancialFacts).not.toHaveBeenCalled();
  });

  it('builds a minimized contribution with no facts and no user or movement identifiers', async () => {
    const ports = sources(granted, profile, []);
    const result = await buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' });
    expect(result).toEqual({ status: 'BUILT', contribution: {
      schemaVersion: 7,
      period: { kind: 'YEAR_MONTH', value: '2026-09' },
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [] },
      categories: { currencies: [] },
      recurring: { currencies: [] },
      sharing: { currencies: [] },
      merchants: { catalogVersion: 1, currencies: [] },
      balances: { currencies: [] },
      tagUsage: { currencies: [] },
    } });
    expect(JSON.stringify(result)).not.toMatch(/private-user-id|private-fact-id|birthYear|occurredAt|accountId|movementId|completedAt|updatedAt/);
    expect(ports.financialFacts.listFinancialFacts).toHaveBeenCalledWith({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'Europe/Madrid' });
    expect(ports.recurringFacts.listRecurringFacts).toHaveBeenCalledWith({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'Europe/Madrid' });
  });

  it('produces structurally identical contributions regardless of fact order', async () => {
    const facts = [fact,
      createFinancialFact({ id: 'second', occurredAt: '2026-09-05T10:00:00Z', source: 'EXPECTED', kind: 'EXPENSE', amount: '0.20', currency: 'EUR' }),
      createFinancialFact({ id: 'third', occurredAt: '2026-09-06T10:00:00Z', source: 'POSTED', kind: 'INCOME', amount: '10.005', currency: 'GBP' }),
    ];
    const build = async (orderedFacts: typeof facts) => buildMacroAnalyticsContribution(sources(granted, profile, orderedFacts), {
      userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid',
    });
    const [forward, rotated, reversed] = await Promise.all([build(facts), build([facts[2], facts[0], facts[1]]), build([...facts].reverse())]);
    expect(forward).toEqual(rotated);
    expect(forward).toEqual(reversed);
  });

  it('propagates source failures instead of converting them into non-eligibility', async () => {
    const ports = sources();
    vi.mocked(ports.financialFacts.listFinancialFacts).mockRejectedValue(new Error('storage unavailable'));
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .rejects.toThrow('storage unavailable');
  });

  it('rejects category totals that do not reconcile with financial totals', async () => {
    const ports = sources();
    vi.mocked(ports.categoryFacts.listCategoryFacts).mockResolvedValue(categoriesFor([createFinancialFact({ ...fact, amount: '0.09' })]));
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .rejects.toThrow('Category contribution does not reconcile');
  });

});
