import type { TaxonomyCategoryItem, TaxonomyTagItem } from '../../shared/domain/corePort';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';

export function normalizeTaxonomyName(value: string): string {
  return value.trim().toLowerCase();
}

export function findActiveCategoryByName(
  items: TaxonomyCategoryItem[],
  appliesTo: TaxonomyCategoryAppliesTo,
  normalizedName: string,
): TaxonomyCategoryItem | undefined {
  return items.find(
    (category) =>
      category.status === 'active'
      && category.appliesTo === appliesTo
      && normalizeTaxonomyName(category.name) === normalizedName,
  );
}

export function mergeCategories(
  previous: TaxonomyCategoryItem[],
  incoming: TaxonomyCategoryItem[],
): TaxonomyCategoryItem[] {
  const byScopeAndName = new Map<string, TaxonomyCategoryItem>();
  for (const category of [...previous, ...incoming]) {
    byScopeAndName.set(`${category.appliesTo}:${normalizeTaxonomyName(category.name)}`, category);
  }
  return [...byScopeAndName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function parseTransactionTagInput(value: string): string[] {
  const uniqueByNormalizedName = new Map<string, string>();
  for (const rawTag of value.split(',')) {
    const tag = rawTag.trim();
    if (!tag) {
      continue;
    }
    const normalized = normalizeTaxonomyName(tag);
    if (!uniqueByNormalizedName.has(normalized)) {
      uniqueByNormalizedName.set(normalized, tag);
    }
  }
  return [...uniqueByNormalizedName.values()];
}

export function resolveKnownTagSelectionIds(tagNames: string[], tags: TaxonomyTagItem[]): string[] {
  if (tagNames.length === 0) {
    return [];
  }
  const knownByNormalizedName = new Map<string, string>();
  for (const tag of tags) {
    if (tag.status !== 'active') {
      continue;
    }
    knownByNormalizedName.set(normalizeTaxonomyName(tag.name), tag.id);
  }
  return [...new Set(
    tagNames
      .map((name) => knownByNormalizedName.get(normalizeTaxonomyName(name)))
      .filter((value): value is string => Boolean(value)),
  )];
}
