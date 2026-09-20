import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { MacroAnalyticsLocalStorageNativePlugin } from './macroAnalyticsLocalStoragePlugin';
import { NativeContributionRebuildQueueAdapter } from './NativeContributionRebuildQueueAdapter';

vi.mock('./macroAnalyticsLocalStoragePlugin', () => ({ MacroAnalyticsLocalStorageNativePlugin: {
  enqueueRebuildPeriod: vi.fn(),
  listRebuildPeriods: vi.fn(),
  removeRebuildPeriod: vi.fn(),
  clearRebuildPeriods: vi.fn(),
} }));

describe('NativeContributionRebuildQueueAdapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps queue operations through the native persistence boundary', async () => {
    const queue = new NativeContributionRebuildQueueAdapter();
    vi.mocked(MacroAnalyticsLocalStorageNativePlugin.listRebuildPeriods).mockResolvedValue({ periods: ['2025-12', '2026-01'] });

    await queue.enqueue('user-1', createAnalyticsPeriod('2026-01'));
    await expect(queue.list('user-1')).resolves.toEqual([createAnalyticsPeriod('2025-12'), createAnalyticsPeriod('2026-01')]);
    await queue.remove('user-1', createAnalyticsPeriod('2026-01'));
    await queue.clear('user-1');

    expect(MacroAnalyticsLocalStorageNativePlugin.enqueueRebuildPeriod).toHaveBeenCalledWith({ userId: 'user-1', period: '2026-01' });
    expect(MacroAnalyticsLocalStorageNativePlugin.removeRebuildPeriod).toHaveBeenCalledWith({ userId: 'user-1', period: '2026-01' });
    expect(MacroAnalyticsLocalStorageNativePlugin.clearRebuildPeriods).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
