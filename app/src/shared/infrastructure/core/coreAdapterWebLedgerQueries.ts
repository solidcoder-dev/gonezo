import type {
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../domain/corePort';
import type { WebLedgerTransaction } from './coreAdapterWebState';

export function listWebLedgerTransactions(
  input: LedgerListTransactionsInput,
  transactions: readonly WebLedgerTransaction[],
  transactionTags: ReadonlyMap<string, readonly string[]>,
): LedgerListTransactionsResult {
  const filters = input.filters ?? {};
  const requestedPage = input.pagination?.page ?? 0;
  const requestedSize = input.pagination?.size ?? 20;
  const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
  const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

  const fromDateEpoch = filters.fromDate ? Date.parse(filters.fromDate) : undefined;
  const toDateEpoch = filters.toDate ? Date.parse(filters.toDate) : undefined;
  const hasFromDateEpoch = typeof fromDateEpoch === 'number' && Number.isFinite(fromDateEpoch);
  const hasToDateEpoch = typeof toDateEpoch === 'number' && Number.isFinite(toDateEpoch);
  const textFilter = filters.text?.trim().toLowerCase();
  const merchantFilter = filters.merchant?.trim().toLowerCase();
  const statusesFilter = filters.statuses && filters.statuses.length > 0 ? new Set(filters.statuses) : null;
  const typesFilter = filters.types && filters.types.length > 0 ? new Set(filters.types) : null;
  const categoryIds = filters.categoryIds && filters.categoryIds.length > 0
    ? filters.categoryIds
    : filters.categoryId
      ? [filters.categoryId]
      : [];
  const categoryIdsFilter = categoryIds.length > 0
    ? new Set(categoryIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const tagIdsFilter = filters.tagIds && filters.tagIds.length > 0
    ? new Set(filters.tagIds.map((value) => value.trim()).filter((value) => value.length > 0))
    : null;
  const parsedAmountMin = filters.amountMin == null ? undefined : Number(filters.amountMin);
  const parsedAmountMax = filters.amountMax == null ? undefined : Number(filters.amountMax);
  const hasAmountMin = typeof parsedAmountMin === 'number' && Number.isFinite(parsedAmountMin);
  const hasAmountMax = typeof parsedAmountMax === 'number' && Number.isFinite(parsedAmountMax);

  const sort = input.sort && input.sort.length > 0
    ? input.sort
    : [{ field: 'occurredAt', direction: 'desc' as const }];

  const filtered = transactions
    .filter((tx) => tx.accountId === input.accountId)
    .filter((tx) => (statusesFilter ? statusesFilter.has(tx.status) : true))
    .filter((tx) => (typesFilter ? typesFilter.has(tx.type) : true))
    .filter((tx) => (categoryIdsFilter ? Boolean(tx.categoryId && categoryIdsFilter.has(tx.categoryId)) : true))
    .filter((tx) => {
      if (!tagIdsFilter) {
        return true;
      }
      const txTagIds = transactionTags.get(tx.id) ?? [];
      return txTagIds.some((tagId) => tagIdsFilter.has(tagId));
    })
    .filter((tx) => {
      if (!hasAmountMin && !hasAmountMax) {
        return true;
      }
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount)) {
        return false;
      }
      if (hasAmountMin && amount < parsedAmountMin!) {
        return false;
      }
      if (hasAmountMax && amount > parsedAmountMax!) {
        return false;
      }
      return true;
    })
    .filter((tx) => {
      if (!hasFromDateEpoch) {
        return true;
      }
      const occurredAtEpoch = Date.parse(tx.occurredAt);
      return Number.isFinite(occurredAtEpoch) && occurredAtEpoch >= fromDateEpoch!;
    })
    .filter((tx) => {
      if (!hasToDateEpoch) {
        return true;
      }
      const occurredAtEpoch = Date.parse(tx.occurredAt);
      return Number.isFinite(occurredAtEpoch) && occurredAtEpoch <= toDateEpoch!;
    })
    .filter((tx) => {
      if (!merchantFilter) {
        return true;
      }
      return (tx.merchant ?? '').toLowerCase().includes(merchantFilter);
    })
    .filter((tx) => {
      if (!textFilter) {
        return true;
      }
      const merchant = tx.merchant?.toLowerCase() ?? '';
      const description = tx.description?.toLowerCase() ?? '';
      return merchant.includes(textFilter) || description.includes(textFilter);
    });

  const sorted = [...filtered].sort((left, right) => {
    for (const criterion of sort) {
      let comparison = 0;

      if (criterion.field === 'amount') {
        const leftAmount = Number(left.amount);
        const rightAmount = Number(right.amount);
        const safeLeft = Number.isFinite(leftAmount) ? leftAmount : 0;
        const safeRight = Number.isFinite(rightAmount) ? rightAmount : 0;
        comparison = safeLeft - safeRight;
      } else {
        comparison = left.occurredAt.localeCompare(right.occurredAt);
      }

      if (comparison !== 0) {
        return criterion.direction === 'asc' ? comparison : -comparison;
      }
    }
    return right.id.localeCompare(left.id);
  });

  const totalElements = sorted.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const startIndex = resolvedPage * size;
  const content = sorted.slice(startIndex, startIndex + size).map((tx) => ({
    id: tx.id,
    accountId: tx.accountId,
    type: tx.type,
    status: tx.status,
    amount: tx.amount,
    currency: tx.currency,
    occurredAt: tx.occurredAt,
    description: tx.description,
    merchant: tx.merchant,
    linkedTransactionId: tx.linkedTransactionId,
    categoryId: tx.categoryId,
    items: tx.items.map((item) => ({ ...item })),
  }));

  return {
    content,
    page: resolvedPage,
    size,
    totalElements,
    totalPages,
    hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
    hasPrevious: resolvedPage > 0,
  };
}
