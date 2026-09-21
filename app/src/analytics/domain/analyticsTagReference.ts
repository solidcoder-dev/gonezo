export type AnalyticsTagReference = Readonly<{
  key: string;
  tagId?: string;
  displayName: string;
}>;

export function compareAnalyticsTagReferenceKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function resolveAnalyticsTagReferences(input: {
  tagIds: readonly string[];
  tagNames: readonly string[];
  taxonomyTags: readonly Readonly<{ id: string; name: string }>[];
  normalizeName: (name: string) => string;
}): AnalyticsTagReference[] {
  const tagsById = new Map(input.taxonomyTags.map((tag) => [tag.id, tag]));
  const idsByNormalizedName = new Map(input.taxonomyTags.map((tag) => [input.normalizeName(tag.name), tag.id]));
  const persistedIds = [...new Set(input.tagIds.map((id) => id.trim()).filter(Boolean))];
  const referencesById = persistedIds.flatMap((tagId) => {
      const tag = tagsById.get(tagId);
      return tag ? [{ key: `tag:${tag.id}`, tagId: tag.id, displayName: tag.name }] : [];
    });
  const references = referencesById.length > 0
    ? referencesById
    : input.tagNames.flatMap((rawName) => {
      const displayName = rawName.trim();
      if (!displayName) return [];
      const normalizedName = input.normalizeName(displayName);
      const tagId = idsByNormalizedName.get(normalizedName);
      const tag = tagId ? tagsById.get(tagId) : undefined;
      return tag
        ? [{ key: `tag:${tag.id}`, tagId: tag.id, displayName: tag.name }]
        : [{ key: `name:${normalizedName}`, displayName }];
    });
  const unique = new Map(references.map((reference) => [reference.key, reference]));
  return [...unique.values()].sort((left, right) => compareAnalyticsTagReferenceKeys(left.key, right.key));
}
