import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import type { AnalyticsOverviewInsightsResult } from '../../application/analytics.port';
import type { OverviewInsightsRailItemView } from './OverviewInsightsRailView.contract';

type OverviewInsightPresentation = {
  iconClassName: string;
  tone: OverviewInsightsRailItemView['tone'];
};

const presentationByKey: Record<OverviewInsightsRailItemView['key'], OverviewInsightPresentation> = {
  topTags: { iconClassName: 'bi bi-tag', tone: 'expense' },
  sharedExpenses: { iconClassName: 'bi bi-people', tone: 'sharing' },
  mostSharedWith: { iconClassName: 'bi bi-person', tone: 'sharing' },
  recurringImpact: { iconClassName: 'bi bi-arrow-repeat', tone: 'recurring' },
  transfers: { iconClassName: 'bi bi-arrow-left-right', tone: 'transfer' },
};

export function presentOverviewInsightsRail(
  result: AnalyticsOverviewInsightsResult,
  currency: string,
): OverviewInsightsRailItemView[] {
  return result.items.map((item) => ({
    key: item.key,
    title: item.title,
    subtitle: item.subtitle,
    amount: formatCurrencyAmount(item.amount, currency),
    ...presentationByKey[item.key],
  }));
}
