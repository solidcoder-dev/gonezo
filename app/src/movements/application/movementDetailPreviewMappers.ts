import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import { mapMovementDetailViewModel } from './movementDetailMappers';
import type { MovementDetailCategoryOption, MovementDetailTagOption, MovementDetailViewModel, SharingDetailState } from './movementDetailView.types';
import type { ExpectedMovementView, MovementsSearchItemView, ScheduledMovementView } from './movementsView.types';

function categoryOptions(
  movement: Pick<TransactionHistoryItemView, 'type' | 'categoryId' | 'category'>
    | Pick<ExpectedMovementView, 'type' | 'categoryId'>
    | Pick<ScheduledMovementView, 'type' | 'categoryId'>,
  categoryName?: string,
): MovementDetailCategoryOption[] {
  const categoryId = movement.categoryId ?? ('category' in movement ? movement.category?.id : undefined);
  const resolvedName = categoryName ?? ('category' in movement ? movement.category?.name : undefined);
  if (!categoryId || !resolvedName) {
    return [];
  }
  return [{
    id: categoryId,
    name: resolvedName,
    appliesTo: movement.type === 'income' ? 'income' : 'expense',
  }];
}

function tagOptions(tags: Array<{ id?: string; name: string }> | undefined): MovementDetailTagOption[] {
  return (tags ?? [])
    .filter((tag): tag is { id: string; name: string } => typeof tag.id === 'string' && tag.id.trim().length > 0)
    .map((tag) => ({ id: tag.id, name: tag.name }));
}

function emptySharing(): SharingDetailState {
  return { phase: 'loaded', value: null };
}

function expectedStatus(status: MovementsSearchItemView['status']): ExpectedMovementView['status'] {
  if (status === 'resolved' || status === 'dismissed') {
    return status;
  }
  return 'pending';
}

function scheduledStatus(status: MovementsSearchItemView['status']): ScheduledMovementView['status'] {
  if (status === 'deactivated') {
    return 'deactivated';
  }
  if (status === 'failed') {
    return 'completed';
  }
  return 'active';
}

export function mapPostedMovementPreview(transaction: TransactionHistoryItemView): Extract<MovementDetailViewModel, { source: 'posted' }> {
  const mapped = mapMovementDetailViewModel({
    detail: { source: 'posted', movement: {
      ...transaction,
      status: transaction.status === 'archived' ? 'voided' : transaction.status,
      items: transaction.items.map((item) => ({ ...item, currency: transaction.currency })),
    } },
    categories: categoryOptions(transaction),
    tags: tagOptions(transaction.tags),
    sharing: emptySharing(),
  });
  if (!mapped || mapped.source !== 'posted') {
    throw new Error(`Unable to map posted movement preview for ${transaction.id}`);
  }
  return {
    ...mapped,
    canEditCategory: false,
    canEditTags: false,
    canToggleIgnored: false,
    canVoid: false,
    sharing: emptySharing(),
  };
}

export function mapExpectedMovementPreview(
  movement: ExpectedMovementView,
  options: {
    categoryName?: string;
    canEditExpected?: boolean;
    canPostExpected?: boolean;
  } = {},
): Extract<MovementDetailViewModel, { source: 'expected' }> {
  if (movement.origin.kind === 'recurring_unlinked' && !movement.origin.occurrenceId) {
    throw new Error(`Expected movement origin occurrence is unavailable for ${movement.id}`);
  }
  const recurringUnlinkedOccurrenceId = movement.origin.kind === 'recurring_unlinked'
    ? movement.origin.occurrenceId
    : undefined;
  const mapped = mapMovementDetailViewModel({
    detail: {
      source: 'expected',
      movement,
      origin: movement.origin.kind === 'manual'
        ? { kind: 'manual' }
        : movement.origin.kind === 'recurring'
          ? { kind: 'recurring', recurringMovementId: movement.origin.recurringMovementId, occurrenceId: movement.origin.occurrenceId, series: null }
          : { kind: 'recurring_unlinked', occurrenceId: recurringUnlinkedOccurrenceId ?? '' },
    },
    categories: categoryOptions(movement, options.categoryName),
    tags: [],
    sharing: emptySharing(),
  });
  if (!mapped || mapped.source !== 'expected') {
    throw new Error(`Unable to map expected movement preview for ${movement.id}`);
  }
  return {
    ...mapped,
    canEditCategory: false,
    canToggleIgnored: false,
    canEditExpected: options.canEditExpected === true && mapped.status === 'pending',
    canPostExpected: options.canPostExpected === true && mapped.status === 'pending',
  };
}

export function mapScheduledMovementPreview(
  movement: ScheduledMovementView,
  options: {
    categoryName?: string;
    tagNames?: string[];
    canDeactivate?: boolean;
  } = {},
): Extract<MovementDetailViewModel, { source: 'scheduled' }> {
  const mapped = mapMovementDetailViewModel({
    detail: { source: 'scheduled', movement: {
      ...movement,
      tagNames: options.tagNames ?? movement.tagNames,
    } },
    categories: categoryOptions(movement, options.categoryName),
    tags: tagOptions((options.tagNames ?? []).map((name, index) => ({ id: `tag-${index}`, name }))),
    sharing: emptySharing(),
  });
  if (!mapped || mapped.source !== 'scheduled') {
    throw new Error(`Unable to map scheduled movement preview for ${movement.id}`);
  }
  return {
    ...mapped,
    canEditCategory: false,
    canEditTags: false,
    canDeactivate: options.canDeactivate === true && mapped.status === 'active',
  };
}

export function searchItemToPostedMovement(entry: MovementsSearchItemView): TransactionHistoryItemView {
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
    ignored: entry.ignored,
    items: entry.items ?? [],
  };
}

export function searchItemToExpectedMovement(entry: MovementsSearchItemView): ExpectedMovementView {
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
    status: expectedStatus(entry.status),
    createdAt: entry.occurredAt,
    updatedAt: entry.occurredAt,
    ignored: entry.ignored,
    origin: { kind: 'manual' },
  };
}

export function searchItemToScheduledMovement(entry: MovementsSearchItemView): ScheduledMovementView {
  return {
    id: entry.id,
    type: entry.type === 'income' || entry.type === 'transfer' ? entry.type : 'expense',
    sourceAccountId: entry.accountId ?? '',
    accountName: entry.accountName,
    amount: entry.amount,
    currency: entry.currency,
    description: entry.description,
    merchant: entry.merchant || entry.title,
    status: scheduledStatus(entry.status),
    startAt: entry.occurredAt,
    nextDueAt: entry.occurredAt,
    zoneId: 'UTC',
    generatedOccurrences: 0,
    splitItems: entry.items ?? [],
    rule: { frequency: 'monthly', interval: 1 },
    recurrenceEnd: { kind: 'never' },
    categoryId: entry.categoryId ?? entry.category?.id,
    tagIds: entry.tags?.map((tag) => tag.id).filter((tagId): tagId is string => typeof tagId === 'string'),
    tagNames: entry.tags?.map((tag) => tag.name),
  };
}
