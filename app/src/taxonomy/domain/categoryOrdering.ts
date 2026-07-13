import type { TaxonomyCategoryView } from './taxonomy.types';

export function normalizeTaxonomyCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

export function compareTaxonomyCategoriesByUsage(
  left: Pick<TaxonomyCategoryView, 'id' | 'name'> & { usageCount?: number },
  right: Pick<TaxonomyCategoryView, 'id' | 'name'> & { usageCount?: number },
): number {
  const usageDifference = (right.usageCount ?? 0) - (left.usageCount ?? 0);
  if (usageDifference !== 0) {
    return usageDifference;
  }

  const normalizedNameDifference = normalizeTaxonomyCategoryName(left.name)
    .localeCompare(normalizeTaxonomyCategoryName(right.name));
  if (normalizedNameDifference !== 0) {
    return normalizedNameDifference;
  }

  return left.id.localeCompare(right.id);
}
