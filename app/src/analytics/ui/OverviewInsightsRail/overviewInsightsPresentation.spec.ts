import { describe, expect, it } from 'vitest';
import { presentOverviewInsightsRail } from './overviewInsightsPresentation';

describe('overviewInsightsPresentation', () => {
  it('maps insight facts into the stable rail presentation', () => {
    const result = presentOverviewInsightsRail({
      items: [
        { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: '380.00' },
        { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '2 shared', amount: '240.00' },
        { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'Ana', amount: '320.00' },
        { key: 'recurringImpact', title: 'Recurring impact', subtitle: '1 recurring', amount: '145.90' },
        { key: 'transfers', title: 'Transfers', subtitle: '4 transfers', amount: '220.00' },
      ],
    }, 'EUR');

    expect(result).toEqual([
      { key: 'topTags', title: 'Top tags', subtitle: '3 tags', amount: '€380.00', iconClassName: 'bi bi-tag', tone: 'expense' },
      { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '2 shared', amount: '€240.00', iconClassName: 'bi bi-people', tone: 'sharing' },
      { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'Ana', amount: '€320.00', iconClassName: 'bi bi-person', tone: 'sharing' },
      { key: 'recurringImpact', title: 'Recurring impact', subtitle: '1 recurring', amount: '€145.90', iconClassName: 'bi bi-arrow-repeat', tone: 'recurring' },
      { key: 'transfers', title: 'Transfers', subtitle: '4 transfers', amount: '€220.00', iconClassName: 'bi bi-arrow-left-right', tone: 'transfer' },
    ]);
  });
});
