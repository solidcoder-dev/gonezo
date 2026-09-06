import { useMemo, useState } from 'react';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import { compareTaxonomyCategoriesByUsage } from '../../taxonomy/application/categoryOrdering';
import { useTagSelectionModel } from '../../taxonomy/application/useTagSelectionModel';
import type { ComposerMode } from './transactions.types';
import { mergeCategories, resolveKnownTagSelectionIds } from './transactionTaxonomySelection';

type UseTransactionTaxonomyModelInput = {
  taxonomy: TaxonomyGatewayPort;
  composerMode: ComposerMode;
};

export function useTransactionTaxonomyModel(input: UseTransactionTaxonomyModelInput) {
  const { taxonomy, composerMode } = input;
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);
  const [transactionCategoryId, setTransactionCategoryId] = useState('');
  const tagSelection = useTagSelectionModel(tags);
  const categorySuggestions = useCategorySuggestions(taxonomy);
  const tagSuggestionSource = useTagSuggestions(taxonomy);
  const transactionClassification = useTransactionClassification(taxonomy);

  const categoryOptions = useMemo(() => {
    if (composerMode !== 'expense' && composerMode !== 'income') {
      return [] as Array<{ id: string; name: string }>;
    }
    const scope = composerMode === 'expense' || composerMode === 'income' ? composerMode : undefined;
    const selectedExistingCategory = categories.find(
      (category) =>
        category.id === transactionCategoryId
        && category.status === 'active'
        && category.appliesTo === composerMode,
    );
    return mergeCategories(
      categories.filter((category) => category.status === 'active' && category.appliesTo === scope),
      selectedExistingCategory ? [selectedExistingCategory] : [],
    )
      .filter((category) => category.status === 'active')
      .filter((category) => category.appliesTo === composerMode)
      .sort(compareTaxonomyCategoriesByUsage)
      .map((category) => ({ id: category.id, name: category.name }))
  }, [categories, composerMode, transactionCategoryId]);

  function resetInputs() {
    setTransactionCategoryId('');
    tagSelection.actions.reset();
  }

  function prefill(tagNames: string[]) { tagSelection.actions.prefill(tagNames); }

  async function refreshLookups() {
    const taxonomyCategories = await categorySuggestions.listCategories({ includeArchived: false });
    setCategories(taxonomyCategories.items);
    const taxonomyTags = await tagSuggestionSource.listTags({ includeArchived: false });
    setTags([...taxonomyTags.items]);
  }

  async function refreshCategories() {
    const taxonomyCategories = await categorySuggestions.listCategories({ includeArchived: false });
    setCategories(taxonomyCategories.items);
  }

  async function resolveCategorySelection(type: TaxonomyCategoryAppliesTo): Promise<string | undefined> {
    const selectedCategoryId = transactionCategoryId.trim();
    if (!selectedCategoryId) {
      return undefined;
    }

    const existing = categories.find(
      (category) =>
        category.id === selectedCategoryId
        && category.status === 'active'
        && category.appliesTo === type,
    );
    if (existing) {
      return existing.id;
    }

    const fresh = await categorySuggestions.listCategories({ appliesTo: type, includeArchived: false });
    setCategories((previous) => mergeCategories(previous, fresh.items));
    const existingFromBackend = fresh.items.find(
      (category) =>
        category.id === selectedCategoryId
        && category.status === 'active'
        && category.appliesTo === type,
    );
    if (existingFromBackend) {
      return existingFromBackend.id;
    }
    return undefined;
  }

  function parseTransactionTags(): string[] {
    return tagSelection.state.selectedNames;
  }

  function resolveTagSelectionIds(tagNames: string[]): string[] {
    return resolveKnownTagSelectionIds(tagNames, tags);
  }

  async function categorizeTransaction(
    transactionId: string,
    transactionType: TaxonomyCategoryAppliesTo,
    categoryId?: string,
  ) {
    if (!categoryId) {
      return;
    }
    const result = await transactionClassification.categorizeTransaction({
      transactionId,
      transactionType,
      categoryId,
    });
    if (result.status === 'failed') {
      throw new Error(result.errorCode ?? result.errorMessage ?? 'Categorization failed');
    }
  }

  async function applyTransactionTags(transactionId: string, tagNames: string[]) {
    if (tagNames.length === 0) {
      return;
    }
    const result = await transactionClassification.applyTransactionTags({
      transactionId,
      tagNames,
    });
    if (result.status === 'failed') {
      throw new Error(result.errorCode ?? result.errorMessage ?? 'Tag assignment failed');
    }
    const fresh = await tagSuggestionSource.listTags({ includeArchived: false });
    setTags([...fresh.items]);
  }

  return {
    state: {
      categories,
      tags,
      transactionCategoryId,
      transactionTagInput: tagSelection.state.query,
      selectedTagOptions: tagSelection.state.selectedOptions,
      tagSuggestions: tagSelection.state.suggestions,
      tagCreateCandidate: tagSelection.state.createCandidate,
      categoryOptions,
      tagOptions: tagSelection.state.options,
    },
    actions: {
      resetInputs,
      prefill,
      refreshLookups,
      refreshCategories,
      setTransactionCategoryId,
      setTransactionTagInput: tagSelection.actions.setQuery,
      selectTag: tagSelection.actions.select,
      createTag: tagSelection.actions.add,
      removeTag: tagSelection.actions.remove,
      removeLastTag: tagSelection.actions.removeLast,
      resolveCategorySelection,
      parseTransactionTags,
      resolveTagSelectionIds,
      categorizeTransaction,
      applyTransactionTags,
      applyTransactionItemTags: transactionClassification.applyTransactionItemTags,
    },
  };
}
