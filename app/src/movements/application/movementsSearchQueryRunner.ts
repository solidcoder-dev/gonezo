import type { MovementsSearchResult } from '../../shared/domain/corePort';
import type {
  MovementsPaginationView,
  MovementsSearchFiltersState,
  MovementsSearchItemView,
} from '../domain/movementsView.types';
import {
  buildPostedTaxonomySearchPage,
  collectPostedTaxonomySearchItems,
  hasPostedTaxonomyFilters,
  hydratePostedSearchItems,
  type PostedTaxonomySearchPort,
} from './postedTaxonomySearch';
import { buildMovementsSearchFilters } from './movementsSearchFilters';
import {
  aggregateMovementsSearchResults,
  emptyMovementsSearchPagination,
  type MovementsSearchAccount,
  withMovementsSearchAccountContext,
} from './movementsSearchResults';

const SEARCH_COLLECTION_PAGE_SIZE = 100;

export type MovementsSearchQueryRunnerInput = {
  core: PostedTaxonomySearchPort;
  accountScope: MovementsSearchAccount[];
  accountId: string | null;
  filters: MovementsSearchFiltersState;
  page: number;
};

export type MovementsSearchQueryRunnerResult = {
  items: MovementsSearchItemView[];
  pagination: MovementsPaginationView;
  page: number;
};

type MovementsSearchQueryStrategyInput = MovementsSearchQueryRunnerInput & {
  selectedAccount?: MovementsSearchAccount;
};

type MovementsSearchQueryStrategy = {
  supports(input: MovementsSearchQueryStrategyInput): boolean;
  search(input: MovementsSearchQueryStrategyInput): Promise<MovementsSearchQueryRunnerResult>;
};

function toRunnerResult(
  items: MovementsSearchItemView[],
  result: MovementsSearchResult,
): MovementsSearchQueryRunnerResult {
  return {
    items,
    pagination: {
      page: result.page,
      size: result.size,
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrevious: result.hasPrevious,
    },
    page: result.page,
  };
}

async function collectCoreSearchItemsForAccount(
  input: MovementsSearchQueryStrategyInput,
  account: MovementsSearchAccount,
): Promise<MovementsSearchItemView[]> {
  const collected: MovementsSearchItemView[] = [];
  let candidatePage = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await input.core.movementsSearch({
      accountId: account.id,
      source: input.filters.source,
      filters: buildMovementsSearchFilters(input.filters),
      pagination: {
        page: candidatePage,
        size: SEARCH_COLLECTION_PAGE_SIZE,
      },
      sort: [
        {
          field: input.filters.sortField,
          direction: input.filters.sortDirection,
        },
      ],
    });
    collected.push(...result.content.map((item) => withMovementsSearchAccountContext(item, account)));
    hasMore = result.hasNext && result.content.length > 0;
    candidatePage += 1;
  }

  return collected;
}

async function collectPostedTaxonomyItemsForAccount(
  input: MovementsSearchQueryStrategyInput,
  account: MovementsSearchAccount,
): Promise<MovementsSearchItemView[]> {
  const result = await collectPostedTaxonomySearchItems({
    core: input.core,
    accountId: account.id,
    filters: input.filters,
  });
  return result.map((item) => withMovementsSearchAccountContext(item, account));
}

const singleAccountPostedTaxonomySearchStrategy: MovementsSearchQueryStrategy = {
  supports: (input) => input.selectedAccount != null && hasPostedTaxonomyFilters(input.filters),
  async search(input) {
    const selectedAccount = input.selectedAccount;
    if (selectedAccount == null) {
      return emptyMovementsSearchQueryResult(input.filters);
    }
    const result = await buildPostedTaxonomySearchPage({
      core: input.core,
      accountId: selectedAccount.id,
      filters: input.filters,
      page: input.page,
    });
    return {
      items: result.items.map((item) => withMovementsSearchAccountContext(item, selectedAccount)),
      pagination: result.pagination,
      page: result.pagination.page,
    };
  },
};

const singleAccountCoreSearchStrategy: MovementsSearchQueryStrategy = {
  supports: (input) => input.selectedAccount != null,
  async search(input) {
    const selectedAccount = input.selectedAccount;
    if (selectedAccount == null) {
      return emptyMovementsSearchQueryResult(input.filters);
    }
    const result = await input.core.movementsSearch({
      accountId: selectedAccount.id,
      source: input.filters.source,
      filters: buildMovementsSearchFilters(input.filters),
      pagination: {
        page: input.page,
        size: input.filters.pageSize,
      },
      sort: [
        {
          field: input.filters.sortField,
          direction: input.filters.sortDirection,
        },
      ],
    });

    const hydratedContent = input.filters.source === 'posted'
      ? await hydratePostedSearchItems(input.core, result.content)
      : result.content;
    return toRunnerResult(
      hydratedContent.map((item) => withMovementsSearchAccountContext(item, selectedAccount)),
      result,
    );
  },
};

const allAccountsPostedTaxonomySearchStrategy: MovementsSearchQueryStrategy = {
  supports: (input) => input.selectedAccount == null && hasPostedTaxonomyFilters(input.filters),
  async search(input) {
    const collected = (await Promise.all(
      input.accountScope.map((account) => collectPostedTaxonomyItemsForAccount(input, account)),
    )).flat();
    return aggregateMovementsSearchResults(collected, input.filters, input.page);
  },
};

const allAccountsCoreSearchStrategy: MovementsSearchQueryStrategy = {
  supports: (input) => input.selectedAccount == null,
  async search(input) {
    const collected = (await Promise.all(
      input.accountScope.map((account) => collectCoreSearchItemsForAccount(input, account)),
    )).flat();
    const hydratedItems = input.filters.source === 'posted'
      ? await hydratePostedSearchItems(input.core, collected)
      : collected;
    return aggregateMovementsSearchResults(hydratedItems, input.filters, input.page);
  },
};

export const movementsSearchQueryStrategies: MovementsSearchQueryStrategy[] = [
  singleAccountPostedTaxonomySearchStrategy,
  singleAccountCoreSearchStrategy,
  allAccountsPostedTaxonomySearchStrategy,
  allAccountsCoreSearchStrategy,
];

export function emptyMovementsSearchQueryResult(
  filters: MovementsSearchFiltersState,
): MovementsSearchQueryRunnerResult {
  return {
    items: [],
    pagination: emptyMovementsSearchPagination(filters.pageSize),
    page: 0,
  };
}

export async function runMovementsSearchQuery(
  input: MovementsSearchQueryRunnerInput,
): Promise<MovementsSearchQueryRunnerResult> {
  if (input.accountScope.length === 0) {
    return emptyMovementsSearchQueryResult(input.filters);
  }

  const strategyInput: MovementsSearchQueryStrategyInput = {
    ...input,
    selectedAccount: input.accountId ? input.accountScope[0] : undefined,
  };
  const strategy = movementsSearchQueryStrategies.find((candidate) => candidate.supports(strategyInput));
  if (strategy == null) {
    return emptyMovementsSearchQueryResult(input.filters);
  }
  return strategy.search(strategyInput);
}
