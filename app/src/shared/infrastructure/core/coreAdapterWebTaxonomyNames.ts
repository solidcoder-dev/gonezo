export function normalizeWebTaxonomyCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeWebTaxonomyTagName(name: string): string {
  return name.trim().toLowerCase();
}

export function uniqueWebTaxonomyTagNames(rawNames: string[]): Map<string, string> {
  const uniqueByNormalizedName = new Map<string, string>();
  for (const rawName of rawNames) {
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    const normalizedName = normalizeWebTaxonomyTagName(name);
    if (!uniqueByNormalizedName.has(normalizedName)) {
      uniqueByNormalizedName.set(normalizedName, name);
    }
  }
  return uniqueByNormalizedName;
}
