import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type {
  OrchestrationTransactionTaxonomyItem,
  TaxonomyTagItem,
} from '../../taxonomy/application/taxonomy.port';
import type {
  AnalyticsOverviewInsightItem,
  AnalyticsOverviewInsightsResult,
} from './analytics.port';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { buildTagSpendingRanking } from './rankings/tagSpendingRanking';

type OverviewInsightsFacts = {
  transactions: OverviewTagTransaction[];
  taxonomyAssignments: OrchestrationTransactionTaxonomyItem[];
  tags: TaxonomyTagItem[];
  currency: string;
};

export type OverviewTagTransaction = LedgerTransactionListItem & { analyticsPersonalAmount?: string };

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

function buildTopTagsInsight(facts: OverviewInsightsFacts): AnalyticsOverviewInsightItem | undefined {
  const assignmentsByTransactionId = tagAssignmentsByTransactionId(facts.taxonomyAssignments);
  const namesById = tagNamesById(facts.tags);
  const ranking = buildTagSpendingRanking(facts.transactions
    .filter((transaction) => isAnalyticsExpenseTransaction(transaction, facts.currency))
    .map((transaction) => {
      const resolvedTagIds = assignmentsByTransactionId.get(transaction.id)
        ?? (transaction.tags ?? []).map((tag) => tag.id);
      return {
        movementId: transaction.id,
        source: 'POSTED' as const,
        type: 'expense' as const,
        currency: transaction.currency,
        personalAmount: ('analyticsPersonalAmount' in transaction && typeof transaction.analyticsPersonalAmount === 'string')
          ? transaction.analyticsPersonalAmount
          : transaction.amount,
        tags: [...new Set(resolvedTagIds)].map((tagId) => ({
          key: `tag:${tagId}`,
          tagId,
          displayName: namesById.get(tagId) ?? transaction.tags?.find((tag) => tag.id === tagId)?.name ?? tagId,
        })),
      };
    }), facts.currency).slice(0, 3);

  if (ranking.length === 0) return undefined;
  return {
    key: 'topTags',
    title: 'Top tags',
    subtitle: pluralize(ranking.length, 'tag', 'tags'),
    amount: ranking.reduce((sum, tag) => sum.add(ExactDecimal.from(tag.amount)), ExactDecimal.from('0')).toFixed(2),
    filterIntent: 'topTags',
    tagIds: ranking.flatMap((tag) => tag.tagId ? [tag.tagId] : []),
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

function buildTransfersInsight(facts: OverviewInsightsFacts): AnalyticsOverviewInsightItem | undefined {
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

  if (uniqueTransfers.size === 0) return undefined;
  return {
    key: 'transfers',
    title: 'Transfers',
    subtitle: pluralize(uniqueTransfers.size, 'transfer', 'transfers'),
    amount: [...uniqueTransfers.values()].reduce((current, transaction) => addAmount(current, transaction.amount), '0.00'),
  };
}

export function buildOverviewInsightsResult(input: {
  topTagsFact: {
    transactions: OverviewTagTransaction[];
    taxonomyAssignments?: OrchestrationTransactionTaxonomyItem[];
    tags?: TaxonomyTagItem[];
  };
  sharingInsights: AnalyticsOverviewInsightItem[];
  recurringInsight?: AnalyticsOverviewInsightItem;
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
    ].filter((item): item is AnalyticsOverviewInsightItem => item != null),
  };
}
