import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributionConsent, type AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { ContributionProfile } from '../domain/contributionProfile';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { FinancialFactSourcePort } from './financialFactSource.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';

const profile: ContributionProfile = { birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' };
const granted = createAnalyticsContributionConsent({ userId: 'private-user-id', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00Z' });
const fact = createFinancialFact({ id: 'private-fact-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '0.10', currency: 'EUR' });

function sources(consent: AnalyticsContributionConsent | null = granted, contributionProfile: ContributionProfile | null = profile, facts = [fact]) {
  const consentSource: AnalyticsContributionConsentPort = { get: vi.fn(async () => consent), save: vi.fn(async () => {}) };
  const profileSource: ContributionProfileSourcePort = { get: vi.fn(async () => contributionProfile) };
  const factSource: FinancialFactSourcePort = { listFinancialFacts: vi.fn(async () => facts) };
  return { consent: consentSource, profile: profileSource, financialFacts: factSource, profileSource, factSource };
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
      schemaVersion: 1,
      period: { kind: 'YEAR_MONTH', value: '2026-09' },
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [] },
    } });
    expect(JSON.stringify(result)).not.toMatch(/private-user-id|private-fact-id|birthYear|occurredAt|accountId|movementId|completedAt|updatedAt/);
    expect(ports.financialFacts.listFinancialFacts).toHaveBeenCalledWith({ period: { kind: 'YEAR_MONTH', value: '2026-09' }, timeZone: 'Europe/Madrid' });
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
});
