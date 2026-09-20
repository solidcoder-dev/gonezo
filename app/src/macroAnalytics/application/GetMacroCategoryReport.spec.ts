import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import type { ProcessedContribution } from './ProcessedContributionSourcePort';
import { GetMacroCategoryReport } from './GetMacroCategoryReport';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

describe('GetMacroCategoryReport', () => {
  it('composes a local cohort category report without contributor or personal category identifiers', async () => {
    const processed: ProcessedContribution[] = [
      {
        contributorId: createAnalyticsContributorId('private-contributor-id'),
        contribution: {
          schemaVersion: 2, period, dimensions,
          financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '8', count: 1 }] }] },
          categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'UNMAPPED_EXPENSE', amount: '8' }] }] },
        },
      },
      {
        contributorId: createAnalyticsContributorId('second-private-id'),
        contribution: {
          schemaVersion: 2, period, dimensions,
          financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '2', count: 1 }] }] },
          categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'DINING', amount: '2' }] }] },
        },
      },
    ];
    const source = { list: vi.fn(async () => processed) };

    const report = await new GetMacroCategoryReport(source).execute({ period, currency: 'eur', cohort: createCohort({ countryCode: 'ES' }) });

    expect(report).toMatchObject({ period, currency: 'EUR', eligibleContributorCount: 2 });
    expect(report.postedExpenseCategories.map(({ category }) => category)).toEqual(['UNMAPPED_EXPENSE', 'DINING']);
    expect(JSON.stringify(report, (_key, value) => typeof value === 'bigint' ? value.toString() : value)).not.toMatch(/private-contributor-id|private-category-id|personalName|userId/);
    expect(source.list).toHaveBeenCalledWith({ period, cohort: report.cohort });
  });
});
