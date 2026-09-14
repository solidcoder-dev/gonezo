import type { SharingGroupSuggestion, SharingPersonSuggestion } from '../domain/shareDraft';

export type SharingGroupHistoryEntry = {
  ownerId: string;
  participantIds: string[];
  usedAt: string;
};

export function listSharingGroupSuggestions(
  history: readonly SharingGroupHistoryEntry[],
  people: readonly SharingPersonSuggestion[],
): SharingGroupSuggestion[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const groups = new Map<string, { key: string; people: SharingPersonSuggestion[]; usageCount: number; lastUsedAt: string }>();

  history.forEach((entry) => {
    const ids = [...new Set(entry.participantIds)]
      .filter((id) => id !== entry.ownerId && peopleById.has(id))
      .sort();
    if (ids.length === 0) return;
    const key = ids.join('|');
    const existing = groups.get(key);
    if (existing) {
      existing.usageCount += 1;
      if (entry.usedAt > existing.lastUsedAt) existing.lastUsedAt = entry.usedAt;
      return;
    }
    groups.set(key, {
      key,
      people: ids.flatMap((id) => {
        const person = peopleById.get(id);
        return person ? [person] : [];
      }),
      usageCount: 1,
      lastUsedAt: entry.usedAt,
    });
  });

  return [...groups.values()].sort((left, right) => (
    right.lastUsedAt.localeCompare(left.lastUsedAt)
    || right.usageCount - left.usageCount
    || left.key.localeCompare(right.key)
  ));
}
