import { useMemo, useState } from 'react';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import type { ComposerMode } from '../domain/transactions.types';
import {
  findActiveCategoryByName,
  mergeCategories,
  normalizeTaxonomyName,
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
  const [transactionCategoryInput, setTransactionCategoryInput] = useState('');
  const [transactionTagInput, setTransactionTagInput] = useState('');

  const categorySuggestions = useCategorySuggestions(taxonomy);
  const tagSuggestions = useTagSuggestions(taxonomy);
  const transactionClassification = useTransactionClassification(taxonomy);

  const categoryOptions = useMemo(() => {
    if (composerMode !== 'expense' && composerMode !== 'income') {
      return [] as Array<{ id: string; name: string }>;
    }
    return categories
      .filter((category) => category.status === 'active')
      .map((category) => ({ id: category.id, name: category.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [categories, composerMode]);

  const tagOptions = useMemo(
    () => tags
      .filter((tag) => tag.status === 'active')
      .map((tag) => ({ id: tag.id, name: tag.name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  );

  function resetInputs() {
    setTransactionCategoryInput('');
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
    const rawInput = transactionCategoryInput.trim();
    if (!rawInput) {
      return undefined;
    }

    const normalizedInput = normalizeTaxonomyName(rawInput);
    const existing = findActiveCategoryByName(categories, type, normalizedInput);
    if (existing) {
      return existing.id;
    }

    const fresh = await categorySuggestions.listCategories({ appliesTo: type, includeArchived: false });
    setCategories((previous) => mergeCategories(previous, fresh.items));

    const existingFromBackend = findActiveCategoryByName(fresh.items, type, normalizedInput);
    if (existingFromBackend) {
      return existingFromBackend.id;
    }

    try {
      const created = await categorySuggestions.createCategory({
        name: rawInput,
        appliesTo: type,
      });

      setCategories((previous) => mergeCategories(previous, [
        ...fresh.items,
        {
          id: created.id,
          name: rawInput,
          appliesTo: type,
          status: 'active',
        } as TaxonomyCategoryItem,
      ]));

      setTransactionCategoryInput(rawInput);
      return created.id;
    } catch (err) {
      const retry = await categorySuggestions.listCategories({ appliesTo: type, includeArchived: false });
      setCategories((previous) => mergeCategories(previous, retry.items));
      const existingAfterRace = findActiveCategoryByName(retry.items, type, normalizedInput);
      if (existingAfterRace) {
        return existingAfterRace.id;
      }
      throw err;
    }
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
      transactionCategoryInput,
      transactionTagInput,
      categoryOptions,
      tagOptions,
    },
    actions: {
      resetInputs,
      refreshLookups,
      refreshCategories,
      setTransactionCategoryInput,
      setTransactionTagInput,
      resolveCategorySelection,
      parseTransactionTags,
      resolveTagSelectionIds,
      categorizeTransaction,
      applyTransactionTags,
    },
  };
}
