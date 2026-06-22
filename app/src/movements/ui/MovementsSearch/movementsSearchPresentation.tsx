import { formatCalendarDay } from '../MonthlyMovements/postedGrouping';
import type {
  ExpectedMovementView,
  MovementsSearchItemView,
  ScheduledMovementView,
} from '../../application/movementsView.types';
import type { TransactionHistoryItemView } from '../../../transactions/application/transactionView.types';
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
    itemClassName: txItemTypeClass(entry.type),
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
    return buildExpectedMovementDetailData(searchEntryToExpectedMovement(entry), {
      ...options,
      categoryName: entry.category?.name,
    });
  }
  if (entry.source === 'scheduled') {
    return buildScheduledMovementDetailData(searchEntryToScheduledMovement(entry), {
      ...options,
      categoryName: entry.category?.name,
      tagNames: entry.tags?.map((tag) => tag.name),
    });
  }
  return buildPostedMovementDetailData(searchEntryToPostedTransaction(entry), options);
}

function searchEntryToPostedTransaction(entry: MovementsSearchItemView): TransactionHistoryItemView {
  return {
    id: entry.id,
    accountId: entry.accountId ?? '',
    accountName: entry.accountName,
    occurredAt: entry.occurredAt,
    description: entry.description,
    merchant: entry.merchant || entry.title,
    amount: entry.amount,
    currency: entry.currency,
    type: entry.type,
    status: entry.status === 'voided' ? 'voided' : 'posted',
    categoryId: entry.categoryId,
    category: entry.category,
    tags: entry.tags,
    items: entry.items ?? [],
  };
}

function searchEntryToExpectedMovement(entry: MovementsSearchItemView): ExpectedMovementView {
  return {
    id: entry.id,
    accountId: entry.accountId ?? '',
    accountName: entry.accountName,
    type: entry.type === 'income' ? 'income' : 'expense',
    amount: entry.amount,
    currency: entry.currency,
    expectedAt: entry.occurredAt,
    description: entry.description,
    merchant: entry.merchant || entry.title,
    categoryId: entry.categoryId ?? entry.category?.id,
    splitItems: entry.items ?? [],
    status: entry.status === 'resolved' || entry.status === 'dismissed' ? entry.status : 'pending',
    createdAt: entry.occurredAt,
    updatedAt: entry.occurredAt,
  };
}

function searchEntryToScheduledMovement(entry: MovementsSearchItemView): ScheduledMovementView {
  return {
    id: entry.id,
    type: entry.type === 'income' || entry.type === 'transfer' ? entry.type : 'expense',
    sourceAccountId: entry.accountId ?? '',
    accountName: entry.accountName,
    amount: entry.amount,
    currency: entry.currency,
    description: entry.description,
    merchant: entry.merchant || entry.title,
    status: entry.status === 'deactivated' ? 'deactivated' : 'active',
    startAt: entry.occurredAt,
    nextDueAt: entry.occurredAt,
    zoneId: 'UTC',
    generatedOccurrences: 0,
    splitItems: entry.items ?? [],
    rule: { frequency: 'monthly', interval: 1 },
    recurrenceEnd: { kind: 'never' },
    categoryId: entry.categoryId ?? entry.category?.id,
    tagIds: entry.tags?.map((tag) => tag.id),
    tagNames: entry.tags?.map((tag) => tag.name),
  };
}
