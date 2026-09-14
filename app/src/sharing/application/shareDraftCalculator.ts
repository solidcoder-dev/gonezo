import type { ShareMemberDraft, ShareMode, ShareSettlementChoice, SharingGroupSuggestion, SharingPersonSuggestion } from '../domain/shareDraft';

export const INITIAL_SHARE_SUGGESTION_LIMIT = 5;
export const SEARCH_SHARE_RESULT_LIMIT = 20;

export const DEFAULT_SHARE_PEOPLE_OPTIONS: SharingPersonSuggestion[] = [
  { id: 'emma', name: 'Emma', email: 'emma@example.com' },
  { id: 'luis', name: 'Luis', email: 'luis@example.com' },
  { id: 'maria', name: 'Maria', email: 'maria@example.com' },
  { id: 'john', name: 'John', email: 'john@example.com' },
  { id: 'alex-johnson', name: 'Alex Johnson', email: 'alex.j@example.com' },
  { id: 'alexandra-rossi', name: 'Alexandra Rossi', email: 'alexandra.r@example.com' },
  { id: 'ali-khan', name: 'Ali Khan', email: 'ali.k@example.com' },
];

export function parseShareCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function formatShareCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function makeSharePerson(name: string, options: readonly SharingPersonSuggestion[] = DEFAULT_SHARE_PEOPLE_OPTIONS): Extract<ShareMemberDraft, { role: 'participant' }> {
  const normalizedName = name.trim();
  const existing = options.find((person) => person.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return {
      id: crypto.randomUUID(), role: 'participant',
      personId: existing.id,
      name: existing.name,
      email: existing.email,
      settlementChoice: 'pending',
      parts: 1,
      amount: '',
      avatarTone: 'custom',
    };
  }
  return {
    id: crypto.randomUUID(), role: 'participant',
    name: normalizedName,
    settlementChoice: 'pending',
    parts: 1,
    amount: '',
    avatarTone: 'custom',
  };
}

export function normalizeShareSettlementChoice(person: Extract<ShareMemberDraft, { role: 'participant' }>): ShareSettlementChoice {
  return person.settlementChoice;
}

export function distributeShareByParts(amountCents: number, people: ShareMemberDraft[]): ShareMemberDraft[] {
  const totalParts = people.reduce((total, person) => total + Math.max(1, person.parts), 0);
  const participantAllocations = people.map((person, index) => index === 0
    ? 0
    : Math.floor((amountCents * Math.max(1, person.parts)) / totalParts));
  const participantsTotal = participantAllocations.reduce((total, cents) => total + cents, 0);
  return people.map((person, index) => {
    const parts = Math.max(1, person.parts);
    const cents = index === 0
      ? amountCents - participantsTotal
      : Math.floor((amountCents * parts) / totalParts);
    return { ...person, amount: formatShareCents(cents) };
  });
}

export function distributeShareEqually(amountCents: number, people: ShareMemberDraft[]): ShareMemberDraft[] {
  if (people.length === 0) return people;
  const participantAmount = Math.floor(amountCents / people.length);
  const participantsTotal = participantAmount * (people.length - 1);
  return people.map((person, index) => ({
    ...person,
    amount: formatShareCents(index === 0 ? amountCents - participantsTotal : participantAmount),
  }));
}

export function resetSharePeopleForMode(mode: ShareMode, amountCents: number, people: ShareMemberDraft[]): ShareMemberDraft[] {
  const resetPeople = people.map((person) => ({ ...person, parts: 1, amount: '' }));
  return mode === 'equal'
    ? distributeShareEqually(amountCents, resetPeople)
    : mode === 'parts' ? distributeShareByParts(amountCents, resetPeople) : resetPeople;
}

export function totalShareCents(people: ShareMemberDraft[]): number {
  return people.reduce((total, person) => total + parseShareCents(person.amount), 0);
}

export function matchesSharePerson(person: SharingPersonSuggestion, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return person.name.toLowerCase().includes(normalized) || Boolean(person.email?.toLowerCase().includes(normalized));
}

export function projectSharePeople(people: readonly SharingPersonSuggestion[], query: string): SharingPersonSuggestion[] {
  const normalizedQuery = query.trim();
  return people
    .filter((person) => normalizedQuery.length === 0 || matchesSharePerson(person, normalizedQuery))
    .slice(0, normalizedQuery.length === 0 ? INITIAL_SHARE_SUGGESTION_LIMIT : SEARCH_SHARE_RESULT_LIMIT);
}

export function matchesShareGroup(group: SharingGroupSuggestion, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  return group.people.some((person) => matchesSharePerson(person, normalizedQuery));
}

export function projectShareGroups(groups: readonly SharingGroupSuggestion[], query: string, excludedIds: ReadonlySet<string>): SharingGroupSuggestion[] {
  const normalizedQuery = query.trim();
  return groups
    .filter((group) => normalizedQuery.length === 0 || matchesShareGroup(group, normalizedQuery))
    .filter((group) => group.people.some((person) => !excludedIds.has(person.id)))
    .slice(0, normalizedQuery.length === 0 ? INITIAL_SHARE_SUGGESTION_LIMIT : SEARCH_SHARE_RESULT_LIMIT);
}
