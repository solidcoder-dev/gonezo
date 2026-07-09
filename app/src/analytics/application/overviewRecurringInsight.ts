import type { AnalyticsOverviewInsightItem } from './analytics.port';
import type { SchedulingMovementItem } from '../../scheduling/application/scheduling.port';

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function recurringSubtitle(count: number): string {
  return `${count} recurring`;
}

export function buildOverviewRecurringInsight(movements: SchedulingMovementItem[]): AnalyticsOverviewInsightItem {
  return {
    key: 'recurringImpact',
    title: 'Recurring impact',
    subtitle: recurringSubtitle(movements.length),
    amount: movements.reduce((total, movement) => addAmount(total, movement.amount), '0.00'),
  };
}
