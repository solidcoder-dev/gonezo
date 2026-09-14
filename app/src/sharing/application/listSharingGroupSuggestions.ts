import type { SharingPersonSuggestion } from '../domain/shareDraft';

export type SharingGroupHistoryEntry = {
  ownerId: string;
  participantIds: string[];
  usedAt: string;
};

export type SharingGroupSuggestion = {
  key: string;
  people: SharingPersonSuggestion[];
  usageCount: number;
  lastUsedAt: string;
};

export function listSharingGroupSuggestions(
  history: SharingGroupHistoryEntry[],
  people: SharingPersonSuggestion[],
): SharingGroupSuggestion[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const groups = new Map<string, SharingGroupSuggestion>();

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
      people: ids.map((id) => peopleById.get(id)!),
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
