import { useMemo, useState } from 'react';
import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import { mapTransactionHistoryList } from '../../transactions/application/transactionViewMappers';

type TaxonomyAssignment = {
  categoryId?: string;
  tagIds: string[];
};

type UseMonthlyMovementsTaxonomyModelInput = {
  taxonomy: TaxonomyGatewayPort;
  transactions: LedgerTransactionListItem[];
};

export function useMonthlyMovementsTaxonomyModel(input: UseMonthlyMovementsTaxonomyModelInput) {
  const { taxonomy, transactions } = input;
  const [taxonomyByTransactionId, setTaxonomyByTransactionId] = useState<Record<string, TaxonomyAssignment>>({});
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const categorySuggestions = useCategorySuggestions(taxonomy);
  const tagSuggestions = useTagSuggestions(taxonomy);
  const transactionClassification = useTransactionClassification(taxonomy);

  const categoryNameById = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const category of categories) {
      mapping.set(category.id, category.name);
    }
    return mapping;
  }, [categories]);

  const tagNameById = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const tag of tags) {
      mapping.set(tag.id, tag.name);
    }
    return mapping;
  }, [tags]);

  const transactionsWithTaxonomy = useMemo(
    () => transactions.map((transaction) => {
      const taxonomyAssignment = taxonomyByTransactionId[transaction.id];
      const categoryId = taxonomyAssignment?.categoryId ?? transaction.categoryId ?? transaction.category?.id;
      const categoryName = categoryId
        ? transaction.category?.name ?? categoryNameById.get(categoryId)
        : undefined;

      const category = categoryId && categoryName
        ? {
            id: categoryId,
            name: categoryName,
          }
        : undefined;

      const taxonomyTagIds = taxonomyAssignment?.tagIds ?? [];
      const fallbackTagMap = new Map(
        (transaction.tags ?? [])
          .map((tag) => [tag.id, tag.name] as const)
          .filter((entry) => entry[0].trim().length > 0 && entry[1].trim().length > 0),
      );
      const tagIds = taxonomyTagIds.length > 0
        ? taxonomyTagIds
        : (transaction.tags ?? []).map((tag) => tag.id);

      const transactionTags = tagIds
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
        ...transaction,
        categoryId,
        category,
        tags: transactionTags,
      };
    }),
    [categoryNameById, tagNameById, taxonomyByTransactionId, transactions],
  );

  const historyItems = useMemo(
    () => mapTransactionHistoryList(transactionsWithTaxonomy),
    [transactionsWithTaxonomy],
  );

  function resetAssignments() {
    setTaxonomyByTransactionId({});
  }

  async function refreshAssignments(items: LedgerTransactionListItem[]) {
    const transactionIds = [...new Set(items.map((item) => item.id).filter((id) => id.trim().length > 0))];
    if (transactionIds.length === 0) {
      resetAssignments();
      return;
    }

    const result = await transactionClassification.listTransactionTaxonomy({ transactionIds });
    const next: Record<string, TaxonomyAssignment> = {};
    for (const item of result.items) {
      next[item.transactionId] = {
        categoryId: item.categoryId,
        tagIds: [...(item.tagIds ?? [])],
      };
    }
    const hasAssignedTags = result.items.some((item) => (item.tagIds ?? []).length > 0);
    if (hasAssignedTags) {
      const taxonomyTags = await tagSuggestions.listTags({ includeArchived: false });
      setTags([...taxonomyTags.items]);
    }
    setTaxonomyByTransactionId(next);
  }

  async function ensureLoaded() {
    const operations: Promise<void>[] = [];

    if (categories.length === 0) {
      operations.push(
        categorySuggestions
          .listCategories({ includeArchived: false })
          .then((result) => setCategories(result.items)),
      );
    }

    if (tags.length === 0) {
      operations.push(
        tagSuggestions
          .listTags({ includeArchived: false })
          .then((result) => setTags(result.items)),
      );
    }

    if (operations.length > 0) {
      await Promise.all(operations);
    }
  }

  return {
    state: {
      historyItems,
      filterOptions: {
        categories: categories.map((category) => ({ id: category.id, label: category.name })),
        tags: tags.map((tag) => ({ id: tag.id, label: tag.name })),
      },
    },
    actions: {
      resetAssignments,
      refreshAssignments,
      ensureLoaded,
    },
  };
}
