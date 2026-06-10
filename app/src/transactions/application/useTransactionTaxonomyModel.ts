import { useMemo, useState } from 'react';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import { listMasterCategories } from '../../taxonomy/domain/masterCategories';
import type { ComposerMode } from './transactions.types';
import {
  mergeCategories,
  parseTransactionTagInput,
  resolveKnownTagSelectionIds,
} from './transactionTaxonomySelection';

type UseTransactionTaxonomyModelInput = {
  taxonomy: TaxonomyGatewayPort;
  composerMode: ComposerMode;
};

export function useTransactionTaxonomyModel(input: UseTransactionTaxonomyModelInput) {
  const { taxonomy, composerMode } = input;
  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);
  const [transactionCategoryId, setTransactionCategoryId] = useState('');
  const [transactionTagInput, setTransactionTagInput] = useState('');

  const categorySuggestions = useCategorySuggestions(taxonomy);
  const tagSuggestions = useTagSuggestions(taxonomy);
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
      listMasterCategories(scope),
      selectedExistingCategory ? [selectedExistingCategory] : [],
    )
      .filter((category) => category.status === 'active')
      .filter((category) => category.appliesTo === composerMode)
      .map((category) => ({ id: category.id, name: category.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [categories, composerMode, transactionCategoryId]);

  const tagOptions = useMemo(
    () => tags
      .filter((tag) => tag.status === 'active')
      .map((tag) => ({ id: tag.id, name: tag.name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  );

  function resetInputs() {
    setTransactionCategoryId('');
    setTransactionTagInput('');
  }

  async function refreshLookups() {
    const taxonomyCategories = await categorySuggestions.listCategories({ includeArchived: false });
    setCategories(taxonomyCategories.items);
    const taxonomyTags = await tagSuggestions.listTags({ includeArchived: false });
    setTags(taxonomyTags.items);
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

    const existing = mergeCategories(listMasterCategories(type), categories).find(
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
    const existingFromBackend = mergeCategories(listMasterCategories(type), fresh.items).find(
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
    return parseTransactionTagInput(transactionTagInput);
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
  }

  return {
    state: {
      categories,
      tags,
      transactionCategoryId,
      transactionTagInput,
      categoryOptions,
      tagOptions,
    },
    actions: {
      resetInputs,
      refreshLookups,
      refreshCategories,
      setTransactionCategoryId,
      setTransactionTagInput,
      resolveCategorySelection,
      parseTransactionTags,
      resolveTagSelectionIds,
      categorizeTransaction,
      applyTransactionTags,
    },
  };
}
