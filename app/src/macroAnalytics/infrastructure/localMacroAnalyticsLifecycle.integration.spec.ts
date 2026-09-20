import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { createCohort } from '../domain/cohort';
import { CalculateContributorMetrics } from '../application/CalculateContributorMetrics';
import { CalculateCohortMetrics } from '../application/CalculateCohortMetrics';
import { GetMacroOverviewReport } from '../application/GetMacroOverviewReport';
import { contributorFinancialMetricDefinitions, contributorFinancialMetricCalculators } from '../application/contributorFinancialMetrics';
import { cohortFinancialMetricCalculators } from '../application/cohortFinancialMetrics';
import { LocalMacroAnalyticsPublicationProcessor } from '../application/LocalMacroAnalyticsPublicationProcessor';
import { RunMacroAnalyticsMaintenance } from '../application/RunMacroAnalyticsMaintenance';
import { prepareMacroAnalyticsPublication } from '../application/prepareMacroAnalyticsPublication';
import { InMemoryAnalyticsContributorIdentityAdapter, InMemoryMacroAnalyticsOutboxAdapter, InMemoryContributionRebuildQueueAdapter, InMemoryMacroAnalyticsBackfillStateAdapter } from './InMemoryMacroAnalyticsAdapters';

describe('local Macro Analytics lifecycle integration', () => {
  it('rebuilds a dirty period through publication processing and exposes new report values', async () => {
    const userId = 'user-a';
    const period = createAnalyticsPeriod('2026-01');
    let facts = [createFinancialFact({ id: 'private-fact', occurredAt: '2026-01-12T12:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '12', currency: 'GBP' })];
    const consent = { get: vi.fn(async () => createAnalyticsContributionConsent({ userId, status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-01-01T00:00:00Z' })), save: vi.fn(async () => {}) };
    const profile = { get: vi.fn(async () => ({ birthYear: 1995, sex: 'female' as const, countryCode: 'GB', regionCode: 'GB-ENG' })) };
    const financialFacts = { listFinancialFacts: vi.fn(async () => facts) };
    const contributionPorts = { consent, profile, financialFacts };
    const identity = new InMemoryAnalyticsContributorIdentityAdapter();
    const outbox = new InMemoryMacroAnalyticsOutboxAdapter();
    const latest = new Map<string, MacroAnalyticsPublication>();
    const latestPort = {
      find: vi.fn(async (contributorId: string, requestedPeriod: { value: string }) => latest.get(`${contributorId}:${requestedPeriod.value}`) ?? null),
      save: vi.fn(async (publication: MacroAnalyticsPublication) => { latest.set(`${publication.contributorId}:${publication.period.value}`, publication); }),
    };
    const processor = new LocalMacroAnalyticsPublicationProcessor(latestPort);
    const queue = new InMemoryContributionRebuildQueueAdapter();
    const backfill = new InMemoryMacroAnalyticsBackfillStateAdapter();
    await backfill.markInitialBackfillComplete(userId, 1);
    const report = new GetMacroOverviewReport({
      list: async ({ period: requestedPeriod }) => [...latest.values()]
        .filter((publication) => publication.period.value === requestedPeriod.value)
        .map((publication) => ({ contributorId: publication.contributorId, contribution: publication.contribution })),
    }, new CalculateContributorMetrics(contributorFinancialMetricCalculators), new CalculateCohortMetrics(cohortFinancialMetricCalculators));

    const maintain = () => RunMacroAnalyticsMaintenance({
      consent,
      backfillState: backfill,
      rebuildQueue: queue,
      periodSource: { listPeriods: async () => [] },
      outbox,
      processor,
      prepare: (input) => prepareMacroAnalyticsPublication({
        contribution: contributionPorts,
        identity,
        generateContributorId: () => createAnalyticsContributorId('stable-contributor'),
        outbox,
        latest: latestPort,
      }, input),
    }, { userId, timeZone: 'Europe/London', now: new Date('2026-01-15T12:00:00Z') });

    await queue.enqueue(userId, period);
    await maintain();
    expect(await outbox.listPending(userId)).toHaveLength(0);
    expect(await queue.list(userId)).toHaveLength(0);
    const cohort = createCohort({ countryCode: 'GB', regionCode: 'GB-ENG' });
    const firstReport = await report.execute({ period, currency: 'GBP', cohort });
    expect(firstReport.medianPostedExpense?.kind === 'MONEY' && firstReport.medianPostedExpense.value.toString()).toBe('12');

    facts = [createFinancialFact({ ...facts[0], amount: '18' })];
    await queue.enqueue(userId, period);
    await maintain();
    const current = [...latest.values()][0];
    expect(current.revision).toBe(2);
    expect(await outbox.listPending(userId)).toHaveLength(0);
    const updatedReport = await report.execute({ period, currency: 'GBP', cohort });
    expect(updatedReport.medianPostedExpense?.kind === 'MONEY' && updatedReport.medianPostedExpense.value.toString()).toBe('18');
    expect(contributorFinancialMetricDefinitions.postedExpenseTotal.id.toString()).toBe('posted_expense_total:v1');
  });
});
