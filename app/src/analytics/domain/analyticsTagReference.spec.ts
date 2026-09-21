import { describe, expect, it } from 'vitest';
import { resolveAnalyticsTagReferences } from './analyticsTagReference';

describe('resolveAnalyticsTagReferences', () => {
  const taxonomyTags = [
    { id: 'tag-home', name: 'Home' },
    { id: 'tag-archived', name: 'Historical', status: 'archived' },
  ];

  it('uses persisted IDs first, including archived taxonomy names', () => {
    expect(resolveAnalyticsTagReferences({
      tagIds: ['tag-archived', 'tag-archived'],
      tagNames: ['Renamed presentation snapshot'],
      taxonomyTags,
      normalizeName: (name) => name.trim().toLowerCase(),
    })).toEqual([{ key: 'tag:tag-archived', tagId: 'tag-archived', displayName: 'Historical' }]);
  });

  it('resolves names by Taxonomy normalization and retains unresolved names locally', () => {
    expect(resolveAnalyticsTagReferences({
      tagIds: [],
      tagNames: [' HOME ', 'missing!'],
      taxonomyTags,
      normalizeName: (name) => name.trim().toLowerCase(),
    })).toEqual([
      { key: 'name:missing!', displayName: 'missing!' },
      { key: 'tag:tag-home', tagId: 'tag-home', displayName: 'Home' },
    ]);
  });
});
