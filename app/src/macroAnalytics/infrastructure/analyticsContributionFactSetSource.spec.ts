import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributionFactSetSource } from './analyticsContributionFactSetSource';

describe('analytics contribution fact-set source', () => {
  it('reads movement facts once and projects Macro-owned facts', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [] }));
    const source = createAnalyticsContributionFactSetSource({ analyticsListMovementFacts }, { resolve: () => null });
    const period = createAnalyticsPeriod('2026-09');

    const facts = await source.readContributionFacts({ period, timeZone: 'Europe/Madrid' });

    expect(analyticsListMovementFacts).toHaveBeenCalledTimes(1);
    expect(facts).toEqual({ financial: [], categories: [], recurring: [], sharing: [], merchants: [], tagUsage: [] });
  });
});
