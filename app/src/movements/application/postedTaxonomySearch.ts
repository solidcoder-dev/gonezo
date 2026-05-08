import type {
  MovementsSearchInput,
  MovementsSearchItem,
  MovementsSearchResult,
  OrchestrationListTransactionTaxonomyInput,
  OrchestrationListTransactionTaxonomyResult,
  TaxonomyListCategoriesInput,
  TaxonomyListCategoriesResult,
  TaxonomyListTagsInput,
  TaxonomyListTagsResult,
} from '../../shared/domain/corePort';
import type {
  MovementsPaginationView,
  MovementsSearchFiltersState,
  MovementsSearchItemView,
} from '../domain/movementsView.types';

const TAXONOMY_CANDIDATE_PAGE_SIZE = 100;

export type PostedTaxonomySearchPort = {
  movementsSearch(input: MovementsSearchInput): Promise<MovementsSearchResult>;
  orchestrationListTransactionTaxonomy(
    input: OrchestrationListTransactionTaxonomyInput,
  ): Promise<OrchestrationListTransactionTaxonomyResult>;
  taxonomyListCategories(input?: TaxonomyListCategoriesInput): Promise<TaxonomyListCategoriesResult>;
  taxonomyListTags(input?: TaxonomyListTagsInput): Promise<TaxonomyListTagsResult>;
};

type PostedTaxonomySearchPageInput = {
  core: PostedTaxonomySearchPort;
  accountId: string;
  filters: MovementsSearchFiltersState;
  page: number;
};

type PostedTaxonomySearchPageResult = {
  items: MovementsSearchItemView[];
  pagination: MovementsPaginationView;
};

function normalizeIdentifierList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizeAmount(value: string): string | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric.toString();
}

function normalizeDate(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function postedCandidateFilters(filters: MovementsSearchFiltersState): MovementsSearchInput['filters'] {
  let amountMin = normalizeAmount(filters.amountMin);
  let amountMax = normalizeAmount(filters.amountMax);
  if (amountMin != null && amountMax != null && Number(amountMin) > Number(amountMax)) {
    [amountMin, amountMax] = [amountMax, amountMin];
  }

  return {
    text: filters.text.trim() || undefined,
    merchant: filters.merchant.trim() || undefined,
    amountMin,
    amountMax,
    fromDate: normalizeDate(filters.fromDate),
    toDate: normalizeDate(filters.toDate),
    types: filters.types.length > 0 ? filters.types : undefined,
  };
}

export function hasPostedTaxonomyFilters(filters: MovementsSearchFiltersState): boolean {
  return filters.source === 'posted'
    && (
      normalizeIdentifierList(filters.categoryIds).length > 0
      || normalizeIdentifierList(filters.tagIds).length > 0
    );
}

export async function hydratePostedSearchItems(
  core: PostedTaxonomySearchPort,
  searchItems: MovementsSearchItemView[],
): Promise<MovementsSearchItemView[]> {
  const transactionIds = [...new Set(
    searchItems
      .filter((item) => item.source === 'posted')
      .map((item) => item.id)
      .filter((id) => id.trim().length > 0),
  )];
  if (transactionIds.length === 0) {
    return searchItems;
  }

  const [taxonomyResult, categories, tags] = await Promise.all([
    core.orchestrationListTransactionTaxonomy({ transactionIds }),
    core.taxonomyListCategories(),
    core.taxonomyListTags(),
  ]);
  const taxonomyByTransactionId = new Map(taxonomyResult.items.map((item) => [item.transactionId, item]));
  const categoryNameById = new Map(categories.items.map((item) => [item.id, item.name] as const));
  const tagNameById = new Map(tags.items.map((item) => [item.id, item.name] as const));

  return searchItems.map((item) => {
    if (item.source !== 'posted') {
      return item;
    }
    const taxonomy = taxonomyByTransactionId.get(item.id);
    const categoryId = taxonomy?.categoryId ?? item.categoryId ?? item.category?.id;
    const categoryName = categoryId
      ? item.category?.name ?? categoryNameById.get(categoryId)
      : undefined;
    const fallbackTagMap = new Map(
      (item.tags ?? [])
        .map((tag) => [tag.id, tag.name] as const)
        .filter(([id, name]) => id.trim().length > 0 && name.trim().length > 0),
    );
    const tagIds = taxonomy?.tagIds && taxonomy.tagIds.length > 0
      ? taxonomy.tagIds
      : (item.tags ?? []).map((tag) => tag.id);
    const hydratedTags = tagIds
      .map((tagId) => {
        const name = tagNameById.get(tagId) ?? fallbackTagMap.get(tagId);
        if (!name || name.trim().length === 0) {
          return undefined;
        }
        return {
          id: tagId,
          name,
        };
      })
      .filter((tag): tag is { id: string; name: string } => tag != null);

    return {
      ...item,
      categoryId,
      category: categoryId && categoryName
        ? {
            id: categoryId,
            name: categoryName,
          }
        : item.category,
      tags: hydratedTags,
    };
  });
}

function applyPostedTaxonomyFilters(
  searchItems: MovementsSearchItemView[],
  filters: MovementsSearchFiltersState,
): MovementsSearchItemView[] {
  const categoryFilter = normalizeIdentifierList(filters.categoryIds);
  const tagFilter = normalizeIdentifierList(filters.tagIds);
  if (categoryFilter.length === 0 && tagFilter.length === 0) {
    return searchItems;
  }

  const categoryIds = new Set(categoryFilter);
  const tagIds = new Set(tagFilter);
  return searchItems.filter((item) => {
    if (item.source !== 'posted') {
      return true;
    }
    if (categoryIds.size > 0) {
      const itemCategoryId = item.categoryId ?? item.category?.id;
      if (!itemCategoryId || !categoryIds.has(itemCategoryId)) {
        return false;
      }
    }
    if (tagIds.size > 0) {
      const itemTagIds = new Set((item.tags ?? []).map((tag) => tag.id));
      if (![...tagIds].some((tagId) => itemTagIds.has(tagId))) {
        return false;
      }
    }
    return true;
  });
}

function toSearchItemView(item: MovementsSearchItem): MovementsSearchItemView {
  return item;
}

export async function buildPostedTaxonomySearchPage(
  input: PostedTaxonomySearchPageInput,
): Promise<PostedTaxonomySearchPageResult> {
  const collected: MovementsSearchItemView[] = [];
  let candidatePage = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await input.core.movementsSearch({
      accountId: input.accountId,
      source: 'posted',
      filters: postedCandidateFilters(input.filters),
      pagination: {
        page: candidatePage,
        size: TAXONOMY_CANDIDATE_PAGE_SIZE,
      },
      sort: [
        {
          field: input.filters.sortField,
          direction: input.filters.sortDirection,
        },
      ],
    });
    collected.push(...result.content.map(toSearchItemView));
    hasMore = result.hasNext && result.content.length > 0;
    candidatePage += 1;
  }

  const filtered = applyPostedTaxonomyFilters(
    await hydratePostedSearchItems(input.core, collected),
    input.filters,
  );
  const pageSize = input.filters.pageSize;
  const totalElements = filtered.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);
  const resolvedPage = totalPages === 0 ? 0 : Math.min(input.page, totalPages - 1);
  const start = resolvedPage * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    pagination: {
      page: resolvedPage,
      size: pageSize,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    },
  };
}
