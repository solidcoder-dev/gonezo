import { formatCalendarDay } from '../MonthlyMovements/postedGrouping';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import type {
  MovementsSearchItemView,
} from '../../application/movementsView.types';
import type { MonthlyTimelineItemViewModel, MonthlyTimelineGroupViewModel } from '../../application/monthlyMovementsTimeline';
import type { MovementDetailDataView } from '../MovementDetailSheet/MovementDetailSheetView';
import { resolveMovementIcon } from '../../../transactions/application/movementIconPresentation';
import {
  buildExpectedMovementDetailData,
  buildPostedMovementDetailData,
  buildScheduledMovementDetailData,
  txAmount,
  txSign,
} from '../MonthlyMovements/monthlyMovementPresentation';
import {
  mapExpectedMovementPreview,
  mapPostedMovementPreview,
  mapScheduledMovementPreview,
  searchItemToExpectedMovement,
  searchItemToPostedMovement,
  searchItemToScheduledMovement,
} from '../../application/movementDetailPreviewMappers';

type SearchPresentationOptions = {
  now?: Date;
};

export type MovementSearchDateGroup = {
  key: string;
  label: string;
  items: MovementsSearchItemView[];
};

type SearchTimelineOptions = SearchPresentationOptions & {
  includeDate?: boolean;
};

export function sourceLabel(source: MovementsSearchItemView['source']): string {
  if (source === 'posted') return 'Posted';
  if (source === 'scheduled') return 'Scheduled';
  return 'Expected';
}

function groupDateLabel(isoDateTime: string, now = new Date()): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }

  const sameYear = parsed.getFullYear() === now.getFullYear();
  const datePart = new Intl.DateTimeFormat('es-ES', sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed).toUpperCase();
  const relative = formatCalendarDay(isoDateTime, now);
  if (relative === 'Today' || relative === 'Yesterday') {
    return `${datePart} · ${relative.toUpperCase()}`;
  }
  return datePart;
}

function groupKey(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) {
    return isoDateTime;
  }
  return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
}

export function groupMovementSearchResultsByDay(
  entries: MovementsSearchItemView[],
  options: SearchPresentationOptions = {},
): MovementSearchDateGroup[] {
  const groups: MovementSearchDateGroup[] = [];
  const groupIndexByKey = new Map<string, number>();

  for (const entry of entries) {
    const key = groupKey(entry.occurredAt);
    const knownIndex = groupIndexByKey.get(key);
    if (knownIndex == null) {
      groups.push({ key, label: groupDateLabel(entry.occurredAt, options.now), items: [entry] });
      groupIndexByKey.set(key, groups.length - 1);
      continue;
    }
    groups[knownIndex].items.push(entry);
  }

  return groups;
}

function timelineDirection(entry: MovementsSearchItemView): MonthlyTimelineItemViewModel['direction'] {
  return entry.type === 'income' || entry.type === 'transfer_in' ? 'income' : 'expense';
}

function timelineMetadata(entry: MovementsSearchItemView, includeDate: boolean, now?: Date): string[] {
  const source = entry.source === 'posted'
    ? undefined
    : sourceLabel(entry.source);
  return [
    source,
    entry.accountName,
    includeDate ? formatCalendarDay(entry.occurredAt, now) : undefined,
    entry.category?.name,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));
}

export function buildMovementSearchTimelineItem(
  entry: MovementsSearchItemView,
  options: SearchTimelineOptions = {},
): MonthlyTimelineItemViewModel {
  const direction = timelineDirection(entry);
  const transfer = entry.type === 'transfer' || entry.type === 'transfer_in' || entry.type === 'transfer_out';
  const icon = resolveMovementIcon({
    direction: transfer ? 'transfer' : direction,
    tagNames: entry.tags?.map((tag) => tag.name),
    categoryName: entry.category?.name,
  });

  return {
    source: entry.source,
    id: entry.id,
    occurredOn: entry.occurredAt,
    title: entry.title,
    amountLabel: txAmount(entry.amount, entry.currency),
    amountSign: txSign(entry.type) as MonthlyTimelineItemViewModel['amountSign'],
    direction,
    icon: {
      className: icon.className,
      tone: direction,
      accessibleLabel: icon.accessibleLabel,
    },
    metadata: timelineMetadata(entry, options.includeDate === true, options.now),
    ignored: entry.ignored,
  };
}

export function buildMovementSearchTimelineGroups(
  groups: MovementSearchDateGroup[],
): MonthlyTimelineGroupViewModel[] {
  return groups.map((group) => ({
    dateKey: group.key,
    dateLabel: group.label,
    items: group.items.map((entry) => buildMovementSearchTimelineItem(entry)),
  }));
}

export function buildMovementSearchDetailData(
  entry: MovementsSearchItemView,
  options: SearchPresentationOptions = {},
): MovementDetailDataView {
  if (entry.source === 'expected') {
    return buildExpectedMovementDetailData(searchItemToExpectedMovement(entry), {
      ...options,
      categoryName: entry.category?.name,
    });
  }
  if (entry.source === 'scheduled') {
    return buildScheduledMovementDetailData(searchItemToScheduledMovement(entry), {
      ...options,
      categoryName: entry.category?.name,
      tagNames: entry.tags?.map((tag) => tag.name),
    });
  }
  return buildPostedMovementDetailData(searchItemToPostedMovement(entry), options);
}

export function buildMovementSearchDetailViewModel(entry: MovementsSearchItemView): MovementDetailViewModel {
  if (entry.source === 'expected') {
    return mapExpectedMovementPreview(searchItemToExpectedMovement(entry), {
      categoryName: entry.category?.name,
    });
  }
  if (entry.source === 'scheduled') {
    return mapScheduledMovementPreview(searchItemToScheduledMovement(entry), {
      categoryName: entry.category?.name,
      tagNames: entry.tags?.map((tag) => tag.name),
    });
  }
  return mapPostedMovementPreview(searchItemToPostedMovement(entry));
}
