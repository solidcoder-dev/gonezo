import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import { createFinancialFact } from '../domain/financialFact';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { FinancialFact } from '../domain/financialFact';
import type { CategoryFact } from '../domain/categoryFact';
import type { RecurringFactSourcePort } from '../application/recurringFactSource.port';
import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { createCohort } from '../domain/cohort';
import { CalculateContributorMetrics } from '../application/CalculateContributorMetrics';
import { CalculateCohortMetrics } from '../application/CalculateCohortMetrics';
import { GetMacroOverviewReport } from '../application/GetMacroOverviewReport';
import { GetMacroCategoryReport } from '../application/GetMacroCategoryReport';
import { GetMacroRecurringReport } from '../application/GetMacroRecurringReport';
import type { ProcessedContributionSourcePort } from '../application/ProcessedContributionSourcePort';
import { contributorFinancialMetricDefinitions, contributorFinancialMetricCalculators } from '../application/contributorFinancialMetrics';
import { cohortFinancialMetricCalculators } from '../application/cohortFinancialMetrics';
import { contributorRecurringMetricCalculators } from '../application/contributorRecurringMetrics';
import { cohortRecurringMetricCalculators } from '../application/cohortRecurringMetrics';
import { serializeMacroAnalyticsPublicationV3 } from './MacroAnalyticsPublicationWireV3';
import { createAnalyticsRecurringFactSource } from './analyticsRecurringFactSource';
import { LocalMacroAnalyticsPublicationProcessor } from '../application/LocalMacroAnalyticsPublicationProcessor';
import { RunMacroAnalyticsMaintenance } from '../application/RunMacroAnalyticsMaintenance';
import { prepareMacroAnalyticsPublication } from '../application/prepareMacroAnalyticsPublication';
import { InMemoryAnalyticsContributorIdentityAdapter, InMemoryMacroAnalyticsOutboxAdapter, InMemoryContributionRebuildQueueAdapter, InMemoryMacroAnalyticsBackfillStateAdapter } from './InMemoryMacroAnalyticsAdapters';

describe('local Macro Analytics lifecycle integration', () => {
  it('rebuilds a dirty period through publication processing and exposes new report values', async () => {
    const userId = 'user-a';
    const period = createAnalyticsPeriod('2026-01');
    let facts = [
      createFinancialFact({ id: 'private-fact', occurredAt: '2026-01-12T12:00:00Z', source: 'POSTED', kind: 'EXPENSE', amount: '12', currency: 'GBP' }),
      createFinancialFact({ id: 'private-scheduled-fact', occurredAt: '2026-01-13T12:00:00Z', source: 'SCHEDULED', kind: 'EXPENSE', amount: '5', currency: 'GBP' }),
    ];
    const scheduledOccurrence: AnalyticsMovementFactItem = {
      analyticsFactId: 'private-occurrence',
      reference: { source: 'scheduledProjection', recurringMovementId: 'private-series', occurrenceId: 'private-occurrence-id' },
      source: 'SCHEDULED_PROJECTION',
      schedulingOrigin: { kind: 'recurring', recurringMovementId: 'private-series' },
      effectiveAt: '2026-01-13T12:00:00Z',
      accountId: 'private-account',
      type: 'expense',
      currency: 'GBP',
      personalAmount: '5',
      fullAmount: '5',
      ignored: false,
      categoryAllocations: [],
      tagIds: [],
    };
    const consent = { get: vi.fn(async () => createAnalyticsContributionConsent({ userId, status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-01-01T00:00:00Z' })), save: vi.fn(async () => {}) };
    const profile = { get: vi.fn(async () => ({ birthYear: 1995, sex: 'female' as const, countryCode: 'GB', regionCode: 'GB-ENG' })) };
    const financialFacts = { listFinancialFacts: vi.fn(async () => facts) };
    const categoryFacts = { listCategoryFacts: vi.fn(async (): Promise<CategoryFact[]> => (facts as readonly FinancialFact[]).flatMap((fact): CategoryFact[] => {
      if (fact.kind !== 'EXPENSE' && fact.kind !== 'INCOME') return [];
      const firstHalf = ExactDecimal.from(String(fact.amount)).ratioTo(ExactDecimal.from(2), 2).toString();
      const secondHalf = ExactDecimal.from(String(fact.amount)).subtract(ExactDecimal.from(firstHalf)).toString();
      const category = fact.kind === 'EXPENSE' ? 'GROCERIES' : 'OTHER_INCOME';
      const unmapped = fact.kind === 'EXPENSE' ? 'UNMAPPED_EXPENSE' : 'UNMAPPED_INCOME';
      const base = { occurredAt: fact.occurredAt, source: fact.source, currency: fact.currency, kind: fact.kind };
      return [
        { ...base, id: `${fact.id}/category/0`, amount: firstHalf, category },
        { ...base, id: `${fact.id}/category/1`, amount: secondHalf, category: unmapped },
      ];
    })) };
    const recurringFactSource: RecurringFactSourcePort = createAnalyticsRecurringFactSource({ analyticsListMovementFacts: vi.fn(async () => ({ items: [scheduledOccurrence] })) });
    const contributionPorts = { consent, profile, financialFacts, categoryFacts, recurringFacts: recurringFactSource };
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
    const processed: ProcessedContributionSourcePort = {
      list: async ({ period: requestedPeriod }) => [...latest.values()]
        .filter((publication) => publication.period.value === requestedPeriod.value)
        .map((publication) => ({ contributorId: publication.contributorId, contribution: publication.contribution })),
    };
    const report = new GetMacroOverviewReport(processed, new CalculateContributorMetrics(contributorFinancialMetricCalculators), new CalculateCohortMetrics(cohortFinancialMetricCalculators));
    const categoryReport = new GetMacroCategoryReport(processed);
    const recurringReport = new GetMacroRecurringReport(processed, new CalculateContributorMetrics(contributorRecurringMetricCalculators), new CalculateCohortMetrics(cohortRecurringMetricCalculators));

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
    const firstCategoryReport = await categoryReport.execute({ period, currency: 'GBP', cohort });
    expect(firstCategoryReport.postedExpenseCategories.map(({ category, totalAmount }) => [category, totalAmount.value.toString()])).toEqual([
      ['GROCERIES', '6'], ['UNMAPPED_EXPENSE', '6'],
    ]);
    expect(JSON.stringify(firstCategoryReport, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value)).not.toMatch(/private-fact|stable-contributor|category\/0/);

    facts = [createFinancialFact({ ...facts[0], amount: '18' }), facts[1]];
    await queue.enqueue(userId, period);
    await maintain();
    const current = [...latest.values()][0];
    expect(current.revision).toBe(2);
    const currentWire = serializeMacroAnalyticsPublicationV3(current);
    expect(currentWire).toContain('"protocolVersion":3');
    expect(currentWire).toContain('"source":"SCHEDULED","kind":"EXPENSE","amount":"5","occurrenceCount":1,"seriesCount":1');
    expect(currentWire).not.toMatch(/private-series|private-occurrence/);
    expect(await outbox.listPending(userId)).toHaveLength(0);
    const updatedReport = await report.execute({ period, currency: 'GBP', cohort });
    expect(updatedReport.medianPostedExpense?.kind === 'MONEY' && updatedReport.medianPostedExpense.value.toString()).toBe('18');
    const updatedCategoryReport = await categoryReport.execute({ period, currency: 'GBP', cohort });
    expect(updatedCategoryReport.postedExpenseCategories.map(({ totalAmount }) => totalAmount.value.toString())).toEqual(['9', '9']);
    expect(current.contribution.schemaVersion).toBe(3);
    const currentRecurringReport = await recurringReport.execute({ period, currency: 'GBP', cohort });
    expect(currentRecurringReport.medianScheduledRecurringExpense?.kind === 'MONEY' && currentRecurringReport.medianScheduledRecurringExpense.value.toString()).toBe('5');
    expect(JSON.stringify(currentRecurringReport, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value)).not.toMatch(/private-series|private-occurrence/);
    expect(contributorFinancialMetricDefinitions.postedExpenseTotal.id.toString()).toBe('posted_expense_total:v1');
  });
});
