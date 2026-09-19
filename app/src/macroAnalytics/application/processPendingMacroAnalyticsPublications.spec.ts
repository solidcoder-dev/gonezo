import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
import { processPendingMacroAnalyticsPublications } from './processPendingMacroAnalyticsPublications';

const period = createAnalyticsPeriod('2026-09');
const publication = createMacroAnalyticsPublication({
  contributorId: createAnalyticsContributorId('analytics-1'),
  period,
  revision: 1,
  contribution: {
    schemaVersion: 1,
    period,
    dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
    financial: { currencies: [] },
  } satisfies MacroAnalyticsContribution,
});

describe('processPendingMacroAnalyticsPublications', () => {
  it('removes durably processed rows and retains revision conflicts', async () => {
    const remove = vi.fn(async () => undefined);
    const outbox: MacroAnalyticsOutboxPort = {
      async get() { return null; },
      async save() {},
      remove,
      async listPending() { return [publication, publication]; },
      async clear() {},
    };
    const processor = { process: vi.fn().mockResolvedValueOnce('ACCEPTED').mockResolvedValueOnce('REVISION_CONFLICT') };

    await expect(processPendingMacroAnalyticsPublications('user-a', { outbox, processor }))
      .resolves.toEqual([
        { period: '2026-09', status: 'ACCEPTED', removedFromOutbox: true },
        { period: '2026-09', status: 'REVISION_CONFLICT', removedFromOutbox: false },
      ]);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('user-a', period);
  });

  it('leaves pending state intact when the processor fails', async () => {
    const remove = vi.fn(async () => undefined);
    const outbox: MacroAnalyticsOutboxPort = {
      async get() { return null; },
      async save() {},
      remove,
      async listPending() { return [publication]; },
      async clear() {},
    };

    await expect(processPendingMacroAnalyticsPublications('user-a', {
      outbox,
      processor: { async process() { throw new Error('durable processing failed'); } },
    })).rejects.toThrow('durable processing failed');
    expect(remove).not.toHaveBeenCalled();
  });
});
