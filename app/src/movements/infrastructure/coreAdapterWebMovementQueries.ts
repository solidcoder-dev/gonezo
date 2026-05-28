import type { LedgerTransactionListItem } from '../../ledger/application/ledgerCore.port';
import type { SchedulingMovementItem } from '../../scheduling/application/schedulingCore.port';
import type { ExpectedMovementItem } from '../../expected/application/expectedCore.port';
import type { MovementsSearchItem } from '../application/movementsCore.port';

export function mapPostedTransactionToSearchItem(transaction: LedgerTransactionListItem): MovementsSearchItem {
  return {
    id: transaction.id,
    source: 'posted',
    type: transaction.type,
    status: transaction.status === 'voided' ? 'voided' : 'posted',
    amount: transaction.amount,
    currency: transaction.currency,
    occurredAt: transaction.occurredAt,
    title: transaction.merchant || transaction.description || 'Movement',
    description: transaction.description,
    merchant: transaction.merchant,
    categoryId: transaction.categoryId,
    category: transaction.category,
    tags: transaction.tags,
    items: transaction.items,
  };
}

export function mapScheduledMovementToSearchItem(
  movement: SchedulingMovementItem,
  categoryNameById: (categoryId: string) => string | undefined,
): MovementsSearchItem {
  const tags = (movement.tagNames ?? movement.tagIds ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => ({ id: tag, name: tag }));
  return {
    id: movement.id,
    source: 'scheduled',
    type: movement.type,
    status: movement.status === 'active' ? 'scheduled' : movement.status === 'deactivated' ? 'deactivated' : 'failed',
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.nextDueAt ?? movement.startAt,
    title: movement.merchant || movement.description || 'Scheduled movement',
    description: movement.description,
    merchant: movement.merchant,
    category: movement.categoryId ? { id: movement.categoryId, name: categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
    tags,
    items: movement.splitItems,
  };
}

export function mapExpectedMovementToSearchItem(
  movement: ExpectedMovementItem,
  categoryNameById: (categoryId: string) => string | undefined,
): MovementsSearchItem {
  return {
    id: movement.id,
    source: 'expected',
    type: movement.type,
    status: movement.status === 'pending' ? 'expected' : movement.status,
    amount: movement.amount,
    currency: movement.currency,
    occurredAt: movement.expectedAt,
    title: movement.merchant || movement.description || 'Expected movement',
    description: movement.description,
    merchant: movement.merchant,
    categoryId: movement.categoryId,
    category: movement.categoryId ? { id: movement.categoryId, name: categoryNameById(movement.categoryId) ?? movement.categoryId } : undefined,
    tags: [],
    items: movement.splitItems,
  };
}
