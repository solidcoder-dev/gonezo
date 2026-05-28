import type {
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
} from '../../ledger/application/ledgerCore.port';
import type {
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
} from '../../taxonomy/application/taxonomyCore.port';
import type {
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
} from '../../scheduling/application/schedulingCore.port';
import type {
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
} from '../../expected/application/expectedCore.port';
import type {
  MovementsSearchFacetsInput,
  MovementsSearchFacetsResult,
} from '../application/movementsCore.port';

type MovementsSearchFacetReader = {
  ledgerListTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult>;
  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
  schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult>;
  expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
};

type MovementsSearchFacetIds = {
  categoryIds: Set<string>;
  tagIds: Set<string>;
};

const MOVEMENTS_SEARCH_FACETS_PAGE_SIZE = 100;

function addIdentifier(target: Set<string>, candidate?: string) {
  const value = candidate?.trim();
  if (value) {
    target.add(value);
  }
}

function addIdentifiers(target: Set<string>, candidates?: string[]) {
  for (const candidate of candidates ?? []) {
    addIdentifier(target, candidate);
  }
}

function normalizeAccountIds(input: MovementsSearchFacetsInput): string[] {
  const seen = new Set<string>();
  const accountIds: string[] = [];
  for (const rawAccountId of input.accountIds) {
    const accountId = rawAccountId.trim();
    if (!accountId || seen.has(accountId)) {
      continue;
    }
    seen.add(accountId);
    accountIds.push(accountId);
  }
  return accountIds;
}

function mergeFacetIds(...items: MovementsSearchFacetIds[]): MovementsSearchFacetIds {
  const categoryIds = new Set<string>();
  const tagIds = new Set<string>();
  for (const item of items) {
    for (const categoryId of item.categoryIds) {
      categoryIds.add(categoryId);
    }
    for (const tagId of item.tagIds) {
      tagIds.add(tagId);
    }
  }
  return { categoryIds, tagIds };
}

async function collectPostedFacetIds(
  reader: MovementsSearchFacetReader,
  accountIds: string[],
): Promise<MovementsSearchFacetIds> {
  const categoryIds = new Set<string>();
  const tagIds = new Set<string>();
  const transactionIds = new Set<string>();

  await Promise.all(accountIds.map(async (accountId) => {
    let page = 0;
    while (true) {
      const result = await reader.ledgerListTransactions({
        accountId,
        filters: {
          statuses: ['posted'],
        },
        pagination: {
          page,
          size: MOVEMENTS_SEARCH_FACETS_PAGE_SIZE,
        },
        sort: [
          {
            field: 'occurredAt',
            direction: 'desc',
          },
        ],
      });

      for (const transaction of result.content) {
        addIdentifier(categoryIds, transaction.categoryId);
        addIdentifier(categoryIds, transaction.category?.id);
        addIdentifiers(tagIds, transaction.tags?.map((tag) => tag.id));
        addIdentifier(transactionIds, transaction.id);
      }

      if (!result.hasNext || result.content.length === 0) {
        break;
      }
      page += 1;
    }
  }));

  if (transactionIds.size > 0) {
    const result = await reader.orchestrationListTransactionTaxonomy({
      transactionIds: [...transactionIds],
    });
    for (const item of result.items) {
      addIdentifier(categoryIds, item.categoryId);
      addIdentifiers(tagIds, item.tagIds);
    }
  }

  return { categoryIds, tagIds };
}

async function collectScheduledFacetIds(
  reader: MovementsSearchFacetReader,
  accountIds: string[],
): Promise<MovementsSearchFacetIds> {
  const categoryIds = new Set<string>();
  const tagIds = new Set<string>();
  const results = await Promise.all(
    accountIds.map((accountId) => reader.schedulingListMovements({ sourceAccountId: accountId })),
  );

  for (const result of results) {
    for (const movement of result.items) {
      addIdentifier(categoryIds, movement.categoryId);
      addIdentifiers(tagIds, movement.tagIds);
    }
  }

  return { categoryIds, tagIds };
}

async function collectExpectedFacetIds(
  reader: MovementsSearchFacetReader,
  accountIds: string[],
): Promise<MovementsSearchFacetIds> {
  const categoryIds = new Set<string>();
  const tagIds = new Set<string>();
  const results = await Promise.all(
    accountIds.map((accountId) => reader.expectedListMovements({ accountId })),
  );

  for (const result of results) {
    for (const movement of result.items) {
      addIdentifier(categoryIds, movement.categoryId);
    }
  }

  return { categoryIds, tagIds };
}

export async function getMovementsSearchFacets(
  reader: MovementsSearchFacetReader,
  input: MovementsSearchFacetsInput,
): Promise<MovementsSearchFacetsResult> {
  const accountIds = normalizeAccountIds(input);
  if (accountIds.length === 0) {
    return { categories: [], tags: [] };
  }

  const [categories, tags, postedIds, scheduledIds, expectedIds] = await Promise.all([
    reader.taxonomyListCategories({ includeArchived: false }),
    reader.taxonomyListTags({ includeArchived: false }),
    collectPostedFacetIds(reader, accountIds),
    collectScheduledFacetIds(reader, accountIds),
    collectExpectedFacetIds(reader, accountIds),
  ]);
  const facetIds = mergeFacetIds(postedIds, scheduledIds, expectedIds);

  return {
    categories: categories.items
      .filter((category) => facetIds.categoryIds.has(category.id))
      .map((category) => ({
        id: category.id,
        name: category.name,
        appliesTo: category.appliesTo,
      })),
    tags: tags.items
      .filter((tag) => facetIds.tagIds.has(tag.id))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
  };
}
