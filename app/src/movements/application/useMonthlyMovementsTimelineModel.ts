import { useMemo } from 'react';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import { buildMonthlyTimelineViewModel } from './monthlyMovementsTimeline';

type UseMonthlyMovementsTimelineModelInput = {
  postedItems: TransactionHistoryItemView[];
  expectedItems: ExpectedMovementView[];
  scheduledItems: ScheduledMovementView[];
  categoryLabels: Array<{ id: string; label: string }>;
  tagLabels: Array<{ id: string; label: string }>;
  viewedYear: number;
  viewedMonthIndex: number;
  currentYear: number;
  currentMonthIndex: number;
};

export function useMonthlyMovementsTimelineModel(input: UseMonthlyMovementsTimelineModelInput) {
  const {
    postedItems,
    expectedItems,
    scheduledItems,
    categoryLabels,
    tagLabels,
    viewedYear,
    viewedMonthIndex,
    currentYear,
    currentMonthIndex,
  } = input;
  return useMemo(() => buildMonthlyTimelineViewModel(
    postedItems,
    expectedItems,
    scheduledItems,
    {
      categoryLabelById: new Map(categoryLabels.map((item) => [item.id, item.label] as const)),
      tagLabelById: new Map(tagLabels.map((item) => [item.id, item.label] as const)),
      includeScheduled: viewedYear > currentYear
        || (viewedYear === currentYear && viewedMonthIndex >= currentMonthIndex),
    },
  ), [
    categoryLabels,
    currentMonthIndex,
    currentYear,
    expectedItems,
    postedItems,
    scheduledItems,
    tagLabels,
    viewedMonthIndex,
    viewedYear,
  ]);
}
