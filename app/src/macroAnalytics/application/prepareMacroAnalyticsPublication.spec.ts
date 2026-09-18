import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { ContributionProfile } from '../domain/contributionProfile';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { FinancialFactSourcePort } from './financialFactSource.port';
import { InMemoryAnalyticsContributorIdentityAdapter, InMemoryMacroAnalyticsOutboxAdapter } from '../infrastructure/InMemoryMacroAnalyticsAdapters';
import { prepareMacroAnalyticsPublication } from './prepareMacroAnalyticsPublication';

const profile: ContributionProfile = { birthYear: 1995, sex: 'female', countryCode: 'ES', regionCode: 'ES-CN' };
const facts = [createFinancialFact({ id: 'private-fact-id', occurredAt: '2026-09-04T10:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '12', currency: 'EUR' })];

function setup(options: { consent?: 'GRANTED' | 'DECLINED' | 'WITHDRAWN' | null; profile?: ContributionProfile | null; facts?: typeof facts } = {}) {
  const identity = new InMemoryAnalyticsContributorIdentityAdapter();
  const outbox = new InMemoryMacroAnalyticsOutboxAdapter();
  const consent: AnalyticsContributionConsentPort = {
    get: vi.fn(async () => options.consent ? createAnalyticsContributionConsent({ userId: 'user-A', status: options.consent, noticeVersion: 1, decidedAt: '2026-09-01T00:00:00Z' }) : null),
    save: vi.fn(async () => {}),
  };
  const profileSource: ContributionProfileSourcePort = { get: vi.fn(async () => options.profile === undefined ? profile : options.profile) };
  const financialFacts: FinancialFactSourcePort = { listFinancialFacts: vi.fn(async () => options.facts ?? facts) };
  const ports = {
    contribution: { consent, profile: profileSource, financialFacts },
    identity,
    generateContributorId: vi.fn(() => createAnalyticsContributorId('opaque-random-id')),
    outbox,
  };
  return { ports, identity, outbox, financialFacts };
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
    const changed = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(changed.status === 'PREPARED' && changed.publication.revision).toBe(2);
    const pending = await state.outbox.listPending(input.userId);
    expect(pending).toHaveLength(1);
    expect(pending[0].revision).toBe(2);
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
    const original = await prepareMacroAnalyticsPublication(state.ports, input);
    vi.mocked(state.financialFacts.listFinancialFacts).mockResolvedValue([secondFact, ...facts]);
    const reordered = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(reordered).toEqual(original);
  });

  it('removes only the current period when consent is absent and does not clear on unavailable profile', async () => {
    const state = setup({ consent: 'GRANTED' });
    await prepareMacroAnalyticsPublication(state.ports, input);
    vi.mocked(state.ports.contribution.consent.get).mockResolvedValue(null);
    await expect(prepareMacroAnalyticsPublication(state.ports, input)).resolves.toEqual({ status: 'NOT_ELIGIBLE', reason: 'CONSENT_NOT_GRANTED' });
    expect(await state.outbox.listPending('user-A')).toHaveLength(0);

    const profileMissing = setup({ consent: 'GRANTED', profile: null });
    await prepareMacroAnalyticsPublication(profileMissing.ports, input);
    expect(await prepareMacroAnalyticsPublication(profileMissing.ports, input)).toEqual({ status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' });
  });

  it('allows empty financial periods to be published', async () => {
    const state = setup({ consent: 'GRANTED', facts: [] });
    const result = await prepareMacroAnalyticsPublication(state.ports, input);
    expect(result.status === 'PREPARED' && result.publication.contribution.financial.currencies).toEqual([]);
  });
});
