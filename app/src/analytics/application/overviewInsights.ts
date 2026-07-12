import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type {
  OrchestrationTransactionTaxonomyItem,
  TaxonomyTagItem,
} from '../../taxonomy/application/taxonomy.port';
import type {
  AnalyticsOverviewInsightItem,
  AnalyticsOverviewInsightsResult,
} from './analytics.port';

type OverviewInsightsFacts = {
  transactions: LedgerTransactionListItem[];
  taxonomyAssignments: OrchestrationTransactionTaxonomyItem[];
  tags: TaxonomyTagItem[];
  currency: string;
};

function addAmount(left: string, right: string): string {
  return (Number(left) + Number(right)).toFixed(2);
}

function isAutomaticOpeningBalance(transaction: LedgerTransactionListItem): boolean {
  return transaction.description?.trim().toLowerCase() === 'opening balance'
    && !transaction.merchant
    && !transaction.categoryId
    && transaction.items.length === 0;
}

function isAnalyticsExpenseTransaction(transaction: LedgerTransactionListItem, currency: string): boolean {
  return transaction.status === 'posted'
    && transaction.type === 'expense'
    && transaction.currency.toUpperCase() === currency
    && !isAutomaticOpeningBalance(transaction);
}

function addAmountToMap(map: Map<string, { name: string; amount: string }>, key: string, name: string, amount: string) {
  const current = map.get(key) ?? { name, amount: '0.00' };
  map.set(key, {
    name: current.name,
    amount: addAmount(current.amount, amount),
  });
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function tagNamesById(tags: TaxonomyTagItem[]): ReadonlyMap<string, string> {
  return new Map(tags.map((tag) => [tag.id, tag.name]));
}

function tagAssignmentsByTransactionId(
  assignments: OrchestrationTransactionTaxonomyItem[],
): ReadonlyMap<string, string[]> {
  return new Map(assignments.map((assignment) => [assignment.transactionId, assignment.tagIds ?? []]));
}

function buildTopTagsInsight(facts: OverviewInsightsFacts): AnalyticsOverviewInsightItem {
  const amountByTag = new Map<string, { name: string; amount: string }>();
  const assignmentsByTransactionId = tagAssignmentsByTransactionId(facts.taxonomyAssignments);
  const namesById = tagNamesById(facts.tags);

  for (const transaction of facts.transactions) {
    if (!isAnalyticsExpenseTransaction(transaction, facts.currency)) {
      continue;
    }

    const resolvedTagIds = assignmentsByTransactionId.get(transaction.id)
      ?? (transaction.tags ?? []).map((tag) => tag.id);

    for (const tagId of resolvedTagIds) {
      addAmountToMap(amountByTag, tagId, namesById.get(tagId) ?? tagId, transaction.amount);
    }
  }

  const topTags = [...amountByTag.values()]
    .sort((left, right) => Number(right.amount) - Number(left.amount))
    .slice(0, 3);

  return {
    key: 'topTags',
    title: 'Top tags',
    subtitle: pluralize(topTags.length, 'tag', 'tags'),
    amount: topTags.reduce((current, tag) => addAmount(current, tag.amount), '0.00'),
  };
}

function transferMovementId(transaction: LedgerTransactionListItem): string {
  if (transaction.type === 'transfer_out') {
    return transaction.id;
  }
  if (transaction.type === 'transfer_in' && transaction.linkedTransactionId) {
    return transaction.linkedTransactionId;
  }
  return transaction.id;
}

function buildTransfersInsight(facts: OverviewInsightsFacts): AnalyticsOverviewInsightItem {
  const uniqueTransfers = new Map<string, LedgerTransactionListItem>();

  for (const transaction of facts.transactions) {
    if (transaction.status !== 'posted' || transaction.currency.toUpperCase() !== facts.currency) {
      continue;
    }
    if (transaction.type !== 'transfer' && transaction.type !== 'transfer_out' && transaction.type !== 'transfer_in') {
      continue;
    }

    const key = transferMovementId(transaction);
    const current = uniqueTransfers.get(key);
    if (!current || (current.type !== 'transfer_out' && transaction.type === 'transfer_out')) {
      uniqueTransfers.set(key, transaction);
    }
  }

  return {
    key: 'transfers',
    title: 'Transfers',
    subtitle: pluralize(uniqueTransfers.size, 'transfer', 'transfers'),
    amount: [...uniqueTransfers.values()].reduce((current, transaction) => addAmount(current, transaction.amount), '0.00'),
  };
}

export function buildOverviewInsightsResult(input: {
  topTagsFact: {
    transactions: LedgerTransactionListItem[];
    taxonomyAssignments?: OrchestrationTransactionTaxonomyItem[];
    tags?: TaxonomyTagItem[];
  };
  sharingInsights: AnalyticsOverviewInsightItem[];
  recurringInsight: AnalyticsOverviewInsightItem;
  transferTransactions: LedgerTransactionListItem[];
  currency: string;
}): AnalyticsOverviewInsightsResult {
  const facts: OverviewInsightsFacts = {
    transactions: input.topTagsFact.transactions,
    taxonomyAssignments: input.topTagsFact.taxonomyAssignments ?? [],
    tags: input.topTagsFact.tags ?? [],
    currency: input.currency.trim().toUpperCase(),
  };
  const transferFacts: OverviewInsightsFacts = {
    transactions: input.transferTransactions,
    taxonomyAssignments: [],
    tags: [],
    currency: facts.currency,
  };

  return {
    items: [
      buildTopTagsInsight(facts),
      ...input.sharingInsights,
      input.recurringInsight,
      buildTransfersInsight(transferFacts),
    ],
  };
}
