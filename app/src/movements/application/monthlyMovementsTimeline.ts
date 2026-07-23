import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import { resolveMovementIcon, type MovementIconDirection } from '../../transactions/application/movementIconPresentation';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';

export type MonthlyTimelineSource = 'posted' | 'expected' | 'scheduled';
export type MonthlyTimelineDirection = 'income' | 'expense';

export type TimelineIconViewModel = {
  className: string;
  tone: MonthlyTimelineDirection;
  accessibleLabel: string;
};

export type MonthlyTimelineItemViewModel = {
  source: MonthlyTimelineSource;
  id: string;
  occurredOn: string;
  title: string;
  amountLabel: string;
  amountSign: '+' | '-' | '';
  direction: MonthlyTimelineDirection;
  icon: TimelineIconViewModel;
  metadata: string[];
  ignored?: boolean;
};

export type MonthlyTimelineGroupViewModel = {
  dateKey: string;
  dateLabel: string;
  items: MonthlyTimelineItemViewModel[];
};

type TimelineMappingOptions = {
  categoryLabelById: ReadonlyMap<string, string>;
  tagLabelById: ReadonlyMap<string, string>;
  includeScheduled: boolean;
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parsedTime(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function dateKey(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : localDateKey(parsed);
}

function dateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
    .format(parsed)
    .toUpperCase();
}

function amountLabel(amount: string, currency: string): string {
  const numeric = Number(amount);
  return formatCurrencyAmount(Number.isNaN(numeric) ? amount : Math.abs(numeric).toString(), currency);
}

function categoryName(categoryId: string | undefined, labels: ReadonlyMap<string, string>): string | undefined {
  return categoryId ? labels.get(categoryId) : undefined;
}

function metadata(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim().length > 0));
}

function movementIcon(
  direction: MonthlyTimelineDirection,
  categoryName?: string,
  tagNames?: string[],
  transfer = false,
): TimelineIconViewModel {
  const iconDirection: MovementIconDirection = transfer ? 'transfer' : direction;
  const icon = resolveMovementIcon({ direction: iconDirection, categoryName, tagNames });
  return {
    className: icon.className,
    tone: direction,
    accessibleLabel: icon.accessibleLabel,
  };
}

function postedItem(item: TransactionHistoryItemView): MonthlyTimelineItemViewModel {
  const direction: MonthlyTimelineDirection = item.type === 'income' || item.type === 'transfer_in' ? 'income' : 'expense';
  const transfer = item.type === 'transfer' || item.type === 'transfer_in' || item.type === 'transfer_out';
  return {
    source: 'posted',
    id: item.id,
    occurredOn: item.occurredAt,
    title: item.merchant || item.description || (item.type === 'income' ? 'Income' : item.type === 'expense' ? 'Expense' : 'Transfer'),
    amountLabel: amountLabel(item.amount, item.currency),
    amountSign: item.type === 'income' || item.type === 'transfer_in' ? '+' : item.type === 'expense' || item.type === 'transfer_out' ? '-' : '',
    direction,
    icon: movementIcon(direction, item.category?.name, item.tags?.map((tag) => tag.name), transfer),
    metadata: metadata([
      item.accountName,
      item.category?.name,
      ...(item.tags ?? []).map((tag) => tag.name),
    ]),
    ignored: item.ignored,
  };
}

function expectedItem(item: ExpectedMovementView, labels: ReadonlyMap<string, string>): MonthlyTimelineItemViewModel {
  const direction: MonthlyTimelineDirection = item.type === 'income' ? 'income' : 'expense';
  return {
    source: 'expected',
    id: item.id,
    occurredOn: item.expectedAt,
    title: item.merchant || item.description || 'Expected movement',
    amountLabel: amountLabel(item.amount, item.currency),
    amountSign: direction === 'income' ? '+' : '-',
    direction,
    icon: movementIcon(direction, categoryName(item.categoryId, labels)),
    metadata: metadata(['Expected', item.accountName, categoryName(item.categoryId, labels)]),
    ignored: item.ignored,
  };
}

function scheduledDate(item: ScheduledMovementView): string {
  return item.nextDueAt ?? item.startAt;
}

function scheduledItem(
  item: ScheduledMovementView,
  categoryLabels: ReadonlyMap<string, string>,
  tagLabels: ReadonlyMap<string, string>,
): MonthlyTimelineItemViewModel {
  const direction: MonthlyTimelineDirection = item.type === 'income' ? 'income' : 'expense';
  const tagNames = item.tagNames && item.tagNames.length > 0
    ? item.tagNames
    : (item.tagIds ?? []).map((tagId) => tagLabels.get(tagId)).filter((name): name is string => Boolean(name));
  const transfer = item.type === 'transfer';
  return {
    source: 'scheduled',
    id: item.id,
    occurredOn: scheduledDate(item),
    title: item.merchant || item.description || 'Scheduled movement',
    amountLabel: amountLabel(item.amount, item.currency),
    amountSign: direction === 'income' ? '+' : transfer ? '' : '-',
    direction,
    icon: movementIcon(direction, categoryName(item.categoryId, categoryLabels), tagNames, transfer),
    metadata: metadata(['Scheduled', item.accountName, categoryName(item.categoryId, categoryLabels)]),
  };
}

function groupTimelineItems(items: MonthlyTimelineItemViewModel[], newestFirst: boolean): MonthlyTimelineGroupViewModel[] {
  const sorted = [...items].sort((left, right) => {
    const timeDifference = parsedTime(left.occurredOn) - parsedTime(right.occurredOn);
    if (timeDifference !== 0) return newestFirst ? -timeDifference : timeDifference;
    if (left.source !== right.source) return left.source === 'expected' ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  const groups = new Map<string, MonthlyTimelineGroupViewModel>();
  for (const item of sorted) {
    const key = dateKey(item.occurredOn);
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
      continue;
    }
    groups.set(key, { dateKey: key, dateLabel: dateLabel(item.occurredOn), items: [item] });
  }
  return [...groups.values()];
}

export function buildPostedTimelineGroups(posted: TransactionHistoryItemView[]): MonthlyTimelineGroupViewModel[] {
  return groupTimelineItems(posted.map(postedItem), true);
}

export function buildMonthlyTimelineViewModel(
  posted: TransactionHistoryItemView[],
  expected: ExpectedMovementView[],
  scheduled: ScheduledMovementView[],
  options: TimelineMappingOptions,
): { postedGroups: MonthlyTimelineGroupViewModel[]; plannedGroups: MonthlyTimelineGroupViewModel[] } {
  const plannedItems = expected.map((item) => expectedItem(item, options.categoryLabelById));
  if (options.includeScheduled) {
    plannedItems.push(...scheduled.map((item) => scheduledItem(item, options.categoryLabelById, options.tagLabelById)));
  }
  return {
    postedGroups: buildPostedTimelineGroups(posted),
    plannedGroups: groupTimelineItems(plannedItems, false),
  };
}
