import type { AnalyticsOverviewInsightItem } from './analytics.port';
import type { SharingMovementDetailsResult } from '../../sharing/application/sharing.port';

type SharingMovementDetails = Exclude<SharingMovementDetailsResult, null>;

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function sharedExpenseCount(details: SharingMovementDetails[]): number {
  return details.filter((item) => item.participants.some((participant) => participant.reimbursable)).length;
}

function sharedExpensesAmount(details: SharingMovementDetails[]): string {
  return details.reduce((total, item) => addAmount(total, item.analytics.excludedLentAmount), '0.00');
}

function mostSharedWithSummary(details: SharingMovementDetails[]): { name: string; amount: string } | undefined {
  const amountByPerson = new Map<string, string>();

  for (const item of details) {
    for (const participant of item.participants) {
      if (!participant.reimbursable) {
        continue;
      }
      const current = amountByPerson.get(participant.displayName) ?? '0.00';
      amountByPerson.set(participant.displayName, addAmount(current, participant.amount));
    }
  }

  return [...amountByPerson.entries()]
    .sort((left, right) => {
      const amountDelta = Number(right[1]) - Number(left[1]);
      return amountDelta !== 0 ? amountDelta : left[0].localeCompare(right[0]);
    })
    .map(([name, amount]) => ({ name, amount }))[0];
}

function sharedExpensesSubtitle(count: number): string {
  return `${count} shared`;
}

export function buildOverviewSharingInsights(details: SharingMovementDetails[]): AnalyticsOverviewInsightItem[] {
  const count = sharedExpenseCount(details);
  const mostSharedWith = mostSharedWithSummary(details);

  return [
    {
      key: 'sharedExpenses',
      title: 'Shared expenses',
      subtitle: sharedExpensesSubtitle(count),
      amount: sharedExpensesAmount(details),
    },
    {
      key: 'mostSharedWith',
      title: 'Most shared with',
      subtitle: mostSharedWith?.name ?? 'No data',
      amount: mostSharedWith?.amount ?? '0.00',
    },
  ];
}
