import { formatCalendarDay } from '../MonthlyMovements/postedGrouping';
import type { MovementDetailViewModel } from '../../application/movementDetailView.types';
import type {
  MovementsSearchItemView,
} from '../../application/movementsView.types';
import type { MovementDetailDataView, MovementAmountKindView } from '../MovementDetailSheet/MovementDetailSheetView';
import type { MovementRowDataView } from '../MovementRow/MovementRowView';
import {
  buildExpectedMovementDetailData,
  buildPostedMovementDetailData,
  buildScheduledMovementDetailData,
  compactTags,
  txAmount,
  txAmountKind,
  txItemTypeClass,
  txKindIconClass,
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

type SearchRowOptions = SearchPresentationOptions & {
  includeDate: boolean;
};

export type MovementSearchDateGroup = {
  key: string;
  label: string;
  items: MovementsSearchItemView[];
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

function amountClassName(kind: MovementAmountKindView): string {
  return `movement-amount movement-amount--${kind}`;
}

function movementRowClassName(baseClassName: string, ignored?: boolean): string {
  return ignored ? `${baseClassName} movement-row--ignored` : baseClassName;
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

export function buildMovementSearchRowData(
  entry: MovementsSearchItemView,
  options: SearchRowOptions,
): MovementRowDataView {
  const amountKind = txAmountKind(entry.type);
  const tagLabel = compactTags(entry.tags);
  const details: MovementRowDataView['details'] = [];
  if (entry.accountName) {
    details.push({ key: 'account', value: entry.accountName, primary: true });
  }
  if (options.includeDate) {
    details.push({ key: 'date', value: formatCalendarDay(entry.occurredAt, options.now) });
  }
  if (entry.category?.name) {
    details.push({ key: 'category', value: entry.category.name });
  }
  if (tagLabel) {
    details.push({ key: 'tags', value: tagLabel });
  }

  return {
    itemClassName: movementRowClassName(txItemTypeClass(entry.type), entry.ignored),
    iconClassName: txKindIconClass(entry.type),
    title: entry.title,
    amount: {
      sign: txSign(entry.type),
      label: txAmount(entry.amount, entry.currency),
      className: amountClassName(amountKind),
    },
    details,
  };
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
