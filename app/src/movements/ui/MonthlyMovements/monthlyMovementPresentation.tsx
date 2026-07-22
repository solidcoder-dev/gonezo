import type { ReactNode } from 'react';
import { resolveSchedulingKind } from '../../../shared/domain/schedulingKind';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import type { TransactionHistoryItemView } from '../../../transactions/application/transactionView.types';
import { formatCalendarDay } from './postedGrouping';
import type { ExpectedMovementView, ScheduledMovementView } from '../../application/movementsView.types';
import type { MovementDetailDataView, MovementAmountKindView } from '../MovementDetailSheet/MovementDetailSheetView';
import type { MovementRowDataView } from '../MovementRow/MovementRowView';

type MovementVisualType = ScheduledMovementView['type'] | ExpectedMovementView['type'];

type PresentationOptions = {
  now?: Date;
};

type ExpectedDetailOptions = PresentationOptions & {
  categoryName?: string;
};

type ScheduledDetailOptions = PresentationOptions & {
  categoryName?: string;
  tagNames?: string[];
};

export type ExpectedDateGroup = {
  key: string;
  label: string;
  items: ExpectedMovementView[];
};

export function txLabel(type: TransactionHistoryItemView['type']): string {
  if (type === 'income') return 'Income';
  if (type === 'expense') return 'Expense';
  if (type === 'transfer_in') return 'Transfer in';
  if (type === 'transfer_out') return 'Transfer out';
  return 'Transfer';
}

export function txSign(type: TransactionHistoryItemView['type']): string {
  if (type === 'income' || type === 'transfer_in') return '+';
  if (type === 'expense' || type === 'transfer_out') return '-';
  return '';
}

export function txItemTypeClass(type: TransactionHistoryItemView['type']): string {
  if (type === 'income') {
    return 'expense-item expense-item--income';
  }
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') {
    return 'expense-item expense-item--transfer';
  }
  return 'expense-item expense-item--expense';
}

function movementRowClassName(baseClassName: string, ignored?: boolean): string {
  return ignored ? `${baseClassName} movement-row--ignored` : baseClassName;
}

export function txAmountKind(type: TransactionHistoryItemView['type']): MovementAmountKindView {
  if (type === 'income') {
    return 'income';
  }
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') {
    return 'transfer';
  }
  return 'expense';
}

function movementAmountKind(type: MovementVisualType): MovementAmountKindView {
  if (type === 'income') {
    return 'income';
  }
  if (type === 'transfer') {
    return 'transfer';
  }
  return 'expense';
}

export function movementAmountClassName(kind: MovementAmountKindView): string {
  return `movement-amount movement-amount--${kind}`;
}

export function movementTypeClass(type: MovementVisualType): string {
  if (type === 'income') {
    return 'expense-item expense-item--income';
  }
  if (type === 'transfer') {
    return 'expense-item expense-item--transfer';
  }
  return 'expense-item expense-item--expense';
}

export function txKindIconClass(type: TransactionHistoryItemView['type']): string {
  if (type === 'income') return 'bi bi-arrow-up-right';
  if (type === 'transfer' || type === 'transfer_in' || type === 'transfer_out') return 'bi bi-arrow-left-right';
  return 'bi bi-arrow-down-right';
}

export function movementKindIconClass(type: MovementVisualType): string {
  if (type === 'income') return 'bi bi-arrow-up-right';
  if (type === 'transfer') return 'bi bi-arrow-left-right';
  return 'bi bi-arrow-down-right';
}

export function txAmount(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
}

export function movementAmountSign(type: MovementVisualType): ReactNode {
  if (type === 'income') {
    return '+';
  }
  if (type === 'transfer') {
    return <i className="bi bi-arrow-left-right movement-amount-transfer-icon" aria-hidden />;
  }
  return '-';
}

export function scheduledStatus(item: ScheduledMovementView): string {
  if (item.status === 'active') return 'scheduled';
  if (item.status === 'deactivated') return 'deactivated';
  if (item.status === 'completed') return 'completed';
  return item.status;
}

export function scheduledOrigin(item: ScheduledMovementView): string {
  const kind = resolveSchedulingKind(item);
  return kind === 'one_shot' ? 'one-shot' : 'recurring';
}

export function expectedOrigin(item: ExpectedMovementView): string {
  return item.origin.kind === 'manual' ? 'manual' : 'recurring';
}

export function compactTags(tags?: Array<{ id: string; name: string }>): string | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }
  const visible = tags.slice(0, 2).map((tag) => `#${tag.name}`);
  if (tags.length > 2) {
    visible.push(`+${tags.length - 2}`);
  }
  return visible.join(' ');
}

export function compactTagNames(tags?: string[]): string | undefined {
  if (!tags || tags.length === 0) {
    return undefined;
  }
  const visible = tags.slice(0, 2).map((tag) => `#${tag}`);
  if (tags.length > 2) {
    visible.push(`+${tags.length - 2}`);
  }
  return visible.join(' ');
}

function compactRowDetails(
  details: Array<MovementRowDataView['details'][number] | undefined>,
): MovementRowDataView['details'] {
  return details.filter((value): value is MovementRowDataView['details'][number] => {
    if (!value) {
      return false;
    }
    return typeof value !== 'string' || value.trim().length > 0;
  });
}

export function groupExpectedMovementsByDate(items: ExpectedMovementView[], now = new Date()): ExpectedDateGroup[] {
  const sorted = [...items].sort((left, right) => {
    const dateComparison = left.expectedAt.localeCompare(right.expectedAt);
    return dateComparison !== 0 ? dateComparison : left.id.localeCompare(right.id);
  });
  const groups: ExpectedDateGroup[] = [];
  for (const item of sorted) {
    const date = new Date(item.expectedAt);
    const key = Number.isNaN(date.getTime()) ? item.expectedAt.slice(0, 10) : date.toISOString().slice(0, 10);
    const existing = groups[groups.length - 1];
    if (existing && existing.key === key) {
      existing.items.push(item);
      continue;
    }
    groups.push({
      key,
      label: formatCalendarDay(item.expectedAt, now),
      items: [item],
    });
  }
  return groups;
}

export function buildPostedMovementRowData(transaction: TransactionHistoryItemView): MovementRowDataView {
  return {
    itemClassName: movementRowClassName(txItemTypeClass(transaction.type), transaction.ignored),
    iconClassName: txKindIconClass(transaction.type),
    title: transaction.merchant || transaction.description || txLabel(transaction.type),
    amount: {
      sign: txSign(transaction.type),
      label: txAmount(transaction.amount, transaction.currency),
      className: movementAmountClassName(txAmountKind(transaction.type)),
    },
    details: compactRowDetails([
      transaction.accountName ? { key: 'account', value: transaction.accountName, primary: true } : undefined,
      transaction.category?.name,
      compactTags(transaction.tags),
    ]),
  };
}

export function buildExpectedMovementRowData(
  movement: ExpectedMovementView,
  options: ExpectedDetailOptions = {},
): MovementRowDataView {
  return {
    itemClassName: movementRowClassName(movementTypeClass(movement.type), movement.ignored),
    iconClassName: movementKindIconClass(movement.type),
    title: movement.merchant || movement.description || 'Expected movement',
    amount: {
      sign: movement.type === 'income' ? '+' : '-',
      label: txAmount(movement.amount, movement.currency),
      className: movementAmountClassName(movementAmountKind(movement.type)),
    },
    details: compactRowDetails([
      movement.accountName ? { key: 'account', value: movement.accountName, primary: true } : undefined,
      `expected ${formatCalendarDay(movement.expectedAt, options.now)}`,
      expectedOrigin(movement),
      options.categoryName,
      movement.status,
    ]),
  };
}

export function buildScheduledMovementRowData(
  movement: ScheduledMovementView,
  options: ScheduledDetailOptions = {},
): MovementRowDataView {
  return {
    itemClassName: movementTypeClass(movement.type),
    iconClassName: movementKindIconClass(movement.type),
    title: movement.merchant || movement.description || 'Scheduled movement',
    amount: {
      sign: movementAmountSign(movement.type),
      label: txAmount(movement.amount, movement.currency),
      className: movementAmountClassName(movementAmountKind(movement.type)),
    },
    details: compactRowDetails([
      movement.accountName ? { key: 'account', value: movement.accountName, primary: true } : undefined,
      `${scheduledOrigin(movement)} · due ${formatCalendarDay(movement.nextDueAt ?? movement.startAt, options.now)}`,
      options.categoryName,
      compactTagNames(options.tagNames),
    ]),
  };
}

export function buildPostedMovementDetailData(
  transaction: TransactionHistoryItemView,
  options: PresentationOptions = {},
): MovementDetailDataView {
  return {
    title: transaction.merchant || transaction.description || txLabel(transaction.type),
    kicker: txLabel(transaction.type),
    iconClassName: txKindIconClass(transaction.type),
    ignored: transaction.ignored,
    amount: {
      kind: txAmountKind(transaction.type),
      sign: txSign(transaction.type),
      value: transaction.amount,
      currency: transaction.currency,
    },
    meta: [
      { label: 'Date', value: formatCalendarDay(transaction.occurredAt, options.now) },
      { label: 'Category', value: transaction.category?.name ?? 'No category' },
      { label: 'Tags', value: compactTags(transaction.tags) ?? 'No tags' },
      { label: 'Status', value: transaction.status },
    ],
    splitItems: transaction.items,
  };
}

export function buildExpectedMovementDetailData(
  movement: ExpectedMovementView,
  options: ExpectedDetailOptions = {},
): MovementDetailDataView {
  return {
    title: movement.merchant || movement.description || 'Expected movement',
    kicker: 'Expected',
    iconClassName: movementKindIconClass(movement.type),
    ignored: movement.ignored,
    amount: {
      kind: 'scheduled',
      sign: movementAmountSign(movement.type),
      value: movement.amount,
      currency: movement.currency,
    },
    meta: [
      { label: 'Expected', value: formatCalendarDay(movement.expectedAt, options.now) },
      { label: 'Category', value: options.categoryName ?? 'No category' },
      { label: 'Origin', value: expectedOrigin(movement) },
      { label: 'Status', value: movement.status },
    ],
    splitItems: movement.splitItems,
  };
}

export function buildScheduledMovementDetailData(
  movement: ScheduledMovementView,
  options: ScheduledDetailOptions = {},
): MovementDetailDataView {
  return {
    title: movement.merchant || movement.description || 'Scheduled movement',
    kicker: 'Scheduled',
    iconClassName: movementKindIconClass(movement.type),
    amount: {
      kind: 'scheduled',
      sign: movementAmountSign(movement.type),
      value: movement.amount,
      currency: movement.currency,
    },
    meta: [
      { label: 'Due', value: formatCalendarDay(movement.nextDueAt ?? movement.startAt, options.now) },
      { label: 'Origin', value: scheduledOrigin(movement) },
      { label: 'Category', value: options.categoryName ?? 'No category' },
      { label: 'Tags', value: compactTagNames(options.tagNames) ?? 'No tags' },
      { label: 'Status', value: scheduledStatus(movement) },
    ],
    splitItems: movement.splitItems,
  };
}
