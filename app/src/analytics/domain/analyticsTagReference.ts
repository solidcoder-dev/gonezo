import { normalizeTagName } from '../../taxonomy/domain/tagName';
import type { AnalyticsTagReference } from '../application/analytics.port';

export function resolveAnalyticsTagReferences(input: {
  tagIds: readonly string[];
  tagNames: readonly string[];
  taxonomyTags: readonly Readonly<{ id: string; name: string }>[];
}): AnalyticsTagReference[] {
  const tagsById = new Map(input.taxonomyTags.map((tag) => [tag.id, tag]));
  const idsByNormalizedName = new Map(input.taxonomyTags.map((tag) => [normalizeTagName(tag.name), tag.id]));
  const persistedIds = [...new Set(input.tagIds.map((id) => id.trim()).filter(Boolean))];
  const references = persistedIds.length > 0
    ? persistedIds.flatMap((tagId) => {
      const tag = tagsById.get(tagId);
      return tag ? [{ key: `tag:${tag.id}`, tagId: tag.id, displayName: tag.name }] : [];
    })
    : input.tagNames.flatMap((rawName) => {
      const displayName = rawName.trim();
      if (!displayName) return [];
      const normalizedName = normalizeTagName(displayName);
      const tagId = idsByNormalizedName.get(normalizedName);
      const tag = tagId ? tagsById.get(tagId) : undefined;
      return tag
        ? [{ key: `tag:${tag.id}`, tagId: tag.id, displayName: tag.name }]
        : [{ key: `name:${normalizedName}`, displayName }];
    });
  const unique = new Map(references.map((reference) => [reference.key, reference]));
  return [...unique.values()].sort((left, right) => left.key.localeCompare(right.key));
}
