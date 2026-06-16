import { useMemo, useState } from 'react';
import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../taxonomy/application/taxonomy.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import { findMasterCategoryById, listMasterCategories } from '../../taxonomy/domain/masterCategories';
import type { ComposerMode } from './transactions.types';
import {
  mergeCategories,
  resolveKnownTagSelectionIds,
  normalizeTaxonomyName,
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
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');

  const categorySuggestions = useCategorySuggestions(taxonomy);
  const tagSuggestionSource = useTagSuggestions(taxonomy);
  const transactionClassification = useTransactionClassification(taxonomy);

  const categoryOptions = useMemo(() => {
    if (composerMode !== 'expense' && composerMode !== 'income') {
      return [] as Array<{ id: string; name: string }>;
    }
    const scope = composerMode === 'expense' || composerMode === 'income' ? composerMode : undefined;
    const masterCategories = listMasterCategories(scope);
    const backendMasterCategoriesByName = new Map(
      categories
        .filter((category) => category.status === 'active' && category.appliesTo === composerMode)
        .map((category) => [category.name.trim().toLowerCase(), category]),
    );
    const selectableMasterCategories = masterCategories.map(
      (master) => backendMasterCategoriesByName.get(master.name.trim().toLowerCase()) ?? master,
    );
    const selectedExistingCategory = categories.find(
      (category) =>
        category.id === transactionCategoryId
        && category.status === 'active'
        && category.appliesTo === composerMode,
    );
    return mergeCategories(
      selectableMasterCategories,
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
  const selectedTagOptions = useMemo(() => selectedTagNames.map((name) => {
    const existing = tagOptions.find((tag) => normalizeTaxonomyName(tag.name) === normalizeTaxonomyName(name));
    return existing ?? { id: `new:${normalizeTaxonomyName(name)}`, name };
  }), [selectedTagNames, tagOptions]);
  const normalizedSelectedTagNames = useMemo(
    () => new Set(selectedTagNames.map(normalizeTaxonomyName)),
    [selectedTagNames],
  );
  const normalizedTagQuery = normalizeTaxonomyName(tagQuery);
  const tagSuggestions = useMemo(
    () => normalizedTagQuery
      ? tagOptions.filter((tag) =>
        !normalizedSelectedTagNames.has(normalizeTaxonomyName(tag.name))
        && normalizeTaxonomyName(tag.name).includes(normalizedTagQuery))
      : [],
    [normalizedSelectedTagNames, normalizedTagQuery, tagOptions],
  );
  const tagCreateCandidate = tagQuery.trim()
    && !tagOptions.some((tag) => normalizeTaxonomyName(tag.name) === normalizedTagQuery)
    && !normalizedSelectedTagNames.has(normalizedTagQuery)
    ? tagQuery.trim()
    : undefined;

  function resetInputs() {
    setTransactionCategoryId('');
    setSelectedTagNames([]);
    setTagQuery('');
  }

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
    return selectedTagNames;
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
    if (findMasterCategoryById(categoryId)) {
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

  function addSelectedTagName(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }
    const normalizedName = normalizeTaxonomyName(trimmedName);
    setSelectedTagNames((previous) =>
      previous.some((tag) => normalizeTaxonomyName(tag) === normalizedName)
        ? previous
        : [...previous, trimmedName]);
    setTagQuery('');
  }

  function selectTag(tagId: string) {
    const tag = tagOptions.find((item) => item.id === tagId);
    if (tag) {
      addSelectedTagName(tag.name);
    }
  }

  function removeTag(tagId: string) {
    const normalizedId = tagId.startsWith('new:') ? tagId.slice(4) : undefined;
    setSelectedTagNames((previous) => previous.filter((name) => {
      const existing = tagOptions.find((tag) => normalizeTaxonomyName(tag.name) === normalizeTaxonomyName(name));
      return existing ? existing.id !== tagId : normalizeTaxonomyName(name) !== normalizedId;
    }));
  }

  function removeLastTag() {
    setSelectedTagNames((previous) => previous.slice(0, -1));
  }

  return {
    state: {
      categories,
      tags,
      transactionCategoryId,
      transactionTagInput: tagQuery,
      selectedTagOptions,
      tagSuggestions,
      tagCreateCandidate,
      categoryOptions,
      tagOptions,
    },
    actions: {
      resetInputs,
      refreshLookups,
      refreshCategories,
      setTransactionCategoryId,
      setTransactionTagInput: setTagQuery,
      selectTag,
      createTag: addSelectedTagName,
      removeTag,
      removeLastTag,
      resolveCategorySelection,
      parseTransactionTags,
      resolveTagSelectionIds,
      categorizeTransaction,
      applyTransactionTags,
    },
  };
}
