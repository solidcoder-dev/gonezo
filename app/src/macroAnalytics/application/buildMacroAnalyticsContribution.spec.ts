import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributionConsent, type AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { ContributionProfile } from '../domain/contributionProfile';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { FinancialFactSourcePort } from './financialFactSource.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { CategoryFactSourcePort } from './categoryFactSource.port';
import type { FinancialFact } from '../domain/financialFact';
import type { CategoryFact } from '../domain/categoryFact';
import type { RecurringFactSourcePort } from './recurringFactSource.port';
import { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
import type { SharingFactSourcePort } from './sharingFactSource.port';
import { createSharingFact } from '../domain/sharingFact';

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

function sources(consent: AnalyticsContributionConsent | null = granted, contributionProfile: ContributionProfile | null = profile, facts = [fact]) {
  const consentSource: AnalyticsContributionConsentPort = { get: vi.fn(async () => consent), save: vi.fn(async () => {}) };
  const profileSource: ContributionProfileSourcePort = { get: vi.fn(async () => contributionProfile) };
  const factSource: FinancialFactSourcePort = { listFinancialFacts: vi.fn(async () => facts) };
  const categoryFacts: CategoryFactSourcePort = { listCategoryFacts: vi.fn(async () => categoriesFor(facts)) };
  const recurringFacts: RecurringFactSourcePort = { listRecurringFacts: vi.fn(async () => []) };
  const sharingFacts: SharingFactSourcePort = { listSharingFacts: vi.fn(async () => []) };
  return { consent: consentSource, profile: profileSource, financialFacts: factSource, categoryFacts, recurringFacts, sharingFacts, profileSource, factSource };
}

describe('buildMacroAnalyticsContribution', () => {
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
      schemaVersion: 4,
      period: { kind: 'YEAR_MONTH', value: '2026-09' },
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [] },
      categories: { currencies: [] },
      recurring: { currencies: [] },
      sharing: { currencies: [] },
    } });
    expect(JSON.stringify(result)).not.toMatch(/private-user-id|private-fact-id|birthYear|occurredAt|accountId|movementId|completedAt|updatedAt/);
    expect(ports.financialFacts.listFinancialFacts).toHaveBeenCalledWith({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'Europe/Madrid' });
    expect(ports.recurringFacts.listRecurringFacts).toHaveBeenCalledWith({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'Europe/Madrid' });
  });

  it('rejects recurring amounts above financial activity but accepts zero recurring amounts', async () => {
    const ports = sources();
    vi.mocked(ports.recurringFacts.listRecurringFacts).mockResolvedValue([{
      id: 'recurring-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '0.11', seriesId: 'private-series',
    }]);
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .rejects.toThrow('Recurring contribution exceeds financial contribution');
    vi.mocked(ports.recurringFacts.listRecurringFacts).mockResolvedValue([{
      id: 'recurring-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', amount: '0', seriesId: 'private-series',
    }]);
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .resolves.toMatchObject({ status: 'BUILT', contribution: { recurring: { currencies: [{ buckets: [{ amount: '0' }] }] } } });
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

  it('includes sharing contribution and rejects personal sharing above financial totals', async () => {
    const ports = sources();
    const sharingFact = createSharingFact({ id: 'sharing-private-id', occurredAt: fact.occurredAt, source: 'POSTED', kind: 'EXPENSE', currency: 'EUR', fullAmount: '0.10', personalAmount: '0.08', participantAllocatedAmount: '0.02', settlementRequiredAmount: '0.02', participantCount: 1, settlementParticipantCount: 1 });
    vi.mocked(ports.sharingFacts.listSharingFacts).mockResolvedValue([sharingFact]);
    const result = await buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' });
    expect(result.status === 'BUILT' && result.contribution.schemaVersion === 4 && result.contribution.sharing.currencies[0].buckets[0])
      .toMatchObject({ personalAmount: '0.08', movementCount: 1, participantCount: 1 });

    vi.mocked(ports.sharingFacts.listSharingFacts).mockResolvedValue([createSharingFact({ ...sharingFact, personalAmount: '0.11', fullAmount: '0.12', participantAllocatedAmount: '0.01', settlementRequiredAmount: '0.01' })]);
    await expect(buildMacroAnalyticsContribution(ports, { userId: 'private-user-id', period: '2026-09', timeZone: 'Europe/Madrid' }))
      .rejects.toThrow('Sharing personal contribution exceeds financial contribution');
  });
});
