import { formatCalendarDay } from '../../transactions/ui/postedGrouping';
import type { MovementsSearchItemView } from '../domain/movementsView.types';
import type { MovementDetailDataView, MovementAmountKindView } from './MovementDetailSheetView';
import type { MovementRowDataView } from './MovementRowView';
import {
  compactTags,
  txAmount,
  txAmountKind,
  txItemTypeClass,
  txKindIconClass,
  txLabel,
  txSign,
} from './monthlyMovementPresentation';

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
  const datePart = new Intl.DateTimeFormat(undefined, sameYear
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
  const amountKind = txAmountKind(entry.type);
  return {
    title: entry.title,
    kicker: `${txLabel(entry.type)} · ${sourceLabel(entry.source)}`,
    iconClassName: txKindIconClass(entry.type),
    amount: {
      kind: amountKind,
      sign: txSign(entry.type),
      value: entry.amount,
      currency: entry.currency,
    },
    meta: [
      entry.accountName ? { label: 'Account', value: entry.accountName } : undefined,
      { label: 'Date', value: formatCalendarDay(entry.occurredAt, options.now) },
      { label: 'Category', value: entry.category?.name ?? 'No category' },
      { label: 'Tags', value: compactTags(entry.tags) ?? 'No tags' },
      { label: 'Source', value: entry.source },
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
    splitItems: entry.items,
  };
}
