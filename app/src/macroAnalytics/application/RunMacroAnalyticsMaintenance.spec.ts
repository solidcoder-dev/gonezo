import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { MacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { ContributionRebuildQueuePort } from './contributionRebuildQueue.port';
import type { MacroAnalyticsBackfillStatePort } from './macroAnalyticsBackfillState.port';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
import type { MacroAnalyticsPublicationProcessorPort } from './macroAnalyticsPublicationProcessor.port';
import { RunMacroAnalyticsMaintenance } from './RunMacroAnalyticsMaintenance';

const consent = createAnalyticsContributionConsent({ userId: 'u', status: 'GRANTED', noticeVersion: 1, decidedAt: '2026-01-01T00:00:00Z' });
const publication = (period: string, revision = 1): MacroAnalyticsPublication => ({
  protocolVersion: 1,
  contributorId: createAnalyticsContributorId('contributor'),
  period: createAnalyticsPeriod(period),
  revision,
  contribution: {
    schemaVersion: 1,
    period: createAnalyticsPeriod(period),
    dimensions: { countryCode: 'GB', regionCode: 'GB-ENG', sex: 'FEMALE', ageBand: '25_34' },
    financial: { currencies: [] },
  },
});

function setup(options: { granted?: boolean; requested?: boolean; processorStatus?: 'ACCEPTED' | 'UPDATED' | 'ALREADY_CURRENT' | 'STALE' | 'REVISION_CONFLICT'; periods?: string[]; backfillVersion?: number } = {}) {
  const pending = new Map<string, MacroAnalyticsPublication>();
  const work = new Set<string>();
  let initialBackfillVersion = options.backfillVersion ?? 0;
  let fullRebuildRequested = options.requested ?? false;
  let fullRebuildRequestVersion = options.requested ? 1 : 0;
  const state: MacroAnalyticsBackfillStatePort = {
    get: vi.fn(async () => ({ initialBackfillVersion, fullRebuildRequested, fullRebuildRequestVersion })),
    markInitialBackfillComplete: vi.fn(async (_user, version) => { initialBackfillVersion = version; }),
    requestFullRebuild: vi.fn(async () => { fullRebuildRequested = true; fullRebuildRequestVersion += 1; }),
    clearFullRebuildRequest: vi.fn(async (_user, version) => { if (fullRebuildRequestVersion === version) fullRebuildRequested = false; }), clear: vi.fn(async () => {}),
  };
  const queue: ContributionRebuildQueuePort = {
    enqueue: vi.fn(async (_user, period) => { work.add(period.value); }),
    list: vi.fn(async () => [...work].sort().map(createAnalyticsPeriod)),
    remove: vi.fn(async (_user, period) => { work.delete(period.value); }),
    clear: vi.fn(async () => { work.clear(); }),
  };
  const outbox: MacroAnalyticsOutboxPort = {
    get: vi.fn(async (_user, period) => pending.get(period.value) ?? null),
    save: vi.fn(async (_user, value) => { pending.set(value.period.value, value); }),
    remove: vi.fn(async (_user, period) => { pending.delete(period.value); }),
    listPending: vi.fn(async () => [...pending.values()]), clear: vi.fn(async () => { pending.clear(); }),
  };
  const processor: MacroAnalyticsPublicationProcessorPort = { process: vi.fn(async () => options.processorStatus ?? 'ACCEPTED') };
  const prepare = vi.fn(async ({ period }: { period: string }) => ({ status: 'PREPARED' as const, publication: publication(period) }));
  const ports = {
    consent: { get: vi.fn(async () => options.granted === false ? null : consent) },
    backfillState: state,
    rebuildQueue: queue,
    periodSource: { listPeriods: vi.fn(async () => (options.periods ?? ['2025-11', '2025-12', '2027-01']).map(createAnalyticsPeriod)) },
    outbox,
    processor,
    prepare,
  };
  return { ports, queue, state, outbox, processor, prepare };
}

const input = { userId: 'u', timeZone: 'Europe/London', now: new Date('2026-01-15T12:00:00Z') };

describe('RunMacroAnalyticsMaintenance', () => {
  it('backfills historical periods, adds current period, excludes future periods, and processes chronologically', async () => {
    const state = setup();
    const result = await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(state.prepare.mock.calls.map(([value]) => value.period)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(result).toMatchObject({ status: 'COMPLETED', rebuiltPeriods: ['2025-11', '2025-12', '2026-01'], pendingPeriods: [] });
    expect(state.state.markInitialBackfillComplete).toHaveBeenCalledWith('u', 4);
    expect(state.ports.periodSource.listPeriods).toHaveBeenCalledTimes(1);
  });

  it('keeps a conflicting publication period queued for retry', async () => {
    const state = setup({ processorStatus: 'REVISION_CONFLICT', periods: [] });
    const result = await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(result.pendingPeriods).toEqual(['2026-01']);
    expect(state.queue.remove).not.toHaveBeenCalled();
  });

  it('processes persisted eligible outbox publications that are not in the rebuild queue', async () => {
    const state = setup({ periods: [] });
    await state.outbox.save('u', publication('2025-12'));

    await RunMacroAnalyticsMaintenance(state.ports, input);

    expect(state.processor.process).toHaveBeenCalledWith(expect.objectContaining({ period: createAnalyticsPeriod('2025-12') }));
    expect(await state.outbox.get('u', createAnalyticsPeriod('2025-12'))).toBeNull();
  });

  it('does not repeat initial historical discovery after marking it complete', async () => {
    const state = setup({ periods: ['2025-11'], backfillVersion: 1 });
    await RunMacroAnalyticsMaintenance(state.ports, input);
    await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(state.ports.periodSource.listPeriods).toHaveBeenCalledTimes(1);
    expect(state.state.markInitialBackfillComplete).toHaveBeenCalledWith('u', 4);
    expect(state.prepare.mock.calls.map(([value]) => value.period)).toEqual(['2025-11', '2026-01', '2026-01']);
  });

  it('runs the V3 to V4 historical backfill once and advances the stored version', async () => {
    const state = setup({ periods: ['2025-11'], backfillVersion: 3 });
    await RunMacroAnalyticsMaintenance(state.ports, input);
    await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(state.state.markInitialBackfillComplete).toHaveBeenCalledTimes(1);
    expect(state.state.markInitialBackfillComplete).toHaveBeenCalledWith('u', 4);
    expect(state.prepare.mock.calls.map(([value]) => value.period)).toEqual(['2025-11', '2026-01', '2026-01']);
  });

  it('does not repeat historical migration after version 4 is recorded', async () => {
    const state = setup({ periods: ['2025-11'], backfillVersion: 4 });
    await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(state.ports.periodSource.listPeriods).not.toHaveBeenCalled();
    expect(state.state.markInitialBackfillComplete).not.toHaveBeenCalled();
  });

  it('does not discover or process periods without consent', async () => {
    const state = setup({ granted: false });
    const result = await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(result.status).toBe('CONSENT_NOT_GRANTED');
    expect(state.ports.periodSource.listPeriods).not.toHaveBeenCalled();
    expect(state.prepare).not.toHaveBeenCalled();
    expect(state.processor.process).not.toHaveBeenCalled();
  });

  it('rediscovers a requested full rebuild and clears the request after enqueue succeeds', async () => {
    const state = setup({ requested: true, periods: [] });
    await RunMacroAnalyticsMaintenance(state.ports, input);
    expect(state.ports.periodSource.listPeriods).toHaveBeenCalledTimes(2);
    expect(state.state.clearFullRebuildRequest).toHaveBeenCalledWith('u', 1);
  });

  it('preserves a newer full rebuild request arriving while historical discovery is running', async () => {
    const state = setup({ requested: true, periods: [] });
    vi.mocked(state.ports.periodSource.listPeriods).mockImplementationOnce(async () => {
      await state.state.requestFullRebuild('u');
      return [];
    });

    await RunMacroAnalyticsMaintenance(state.ports, input);

    expect((await state.state.get('u')).fullRebuildRequested).toBe(true);
  });
});
