import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsPeriodSnapshotSource } from './analyticsPeriodSnapshotSource';

describe('analytics period snapshot source', () => {
  it('reads movement facts once and preserves the period boundary', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [{ analyticsFactId: 'fact-1' }] as never[] }));
    const source = createAnalyticsPeriodSnapshotSource({ analyticsListMovementFacts });
    const period = createAnalyticsPeriod('2026-09');

    const snapshot = await source.readPeriodSnapshot({ period, timeZone: 'Europe/Madrid' });

    expect(analyticsListMovementFacts).toHaveBeenCalledTimes(1);
    expect(snapshot).toEqual({ period, movements: [{ analyticsFactId: 'fact-1' }] });
  });
});
