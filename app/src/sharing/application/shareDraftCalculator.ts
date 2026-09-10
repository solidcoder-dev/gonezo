import type { ShareMode, SharePersonDraft, SharingPersonSuggestion } from '../domain/shareDraft';

export const DEFAULT_SHARE_PEOPLE_OPTIONS: SharePersonDraft[] = [
  { id: 'emma', name: 'Emma', email: 'emma@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'emma' },
  { id: 'luis', name: 'Luis', email: 'luis@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'luis' },
  { id: 'maria', name: 'Maria', email: 'maria@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'maria' },
  { id: 'john', name: 'John', email: 'john@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'john' },
  { id: 'alex-johnson', name: 'Alex Johnson', email: 'alex.j@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'alex' },
  { id: 'alexandra-rossi', name: 'Alexandra Rossi', email: 'alexandra.r@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'alexandra' },
  { id: 'ali-khan', name: 'Ali Khan', email: 'ali.k@example.com', reimbursable: true, parts: 1, amount: '', avatarTone: 'ali' },
];

export function parseShareCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function formatShareCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function makeSharePerson(name: string, options: SharingPersonSuggestion[] = DEFAULT_SHARE_PEOPLE_OPTIONS): SharePersonDraft {
  const normalizedName = name.trim();
  const existing = options.find((person) => person.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return {
      id: crypto.randomUUID(),
      personId: existing.id,
      name: existing.name,
      email: existing.email,
      reimbursable: true,
      parts: 1,
      amount: '',
      avatarTone: 'custom',
    };
  }
  return {
    id: crypto.randomUUID(),
    name: normalizedName,
    reimbursable: true,
    parts: 1,
    amount: '',
    avatarTone: 'custom',
  };
}

export function distributeShareByParts(amountCents: number, people: SharePersonDraft[]): SharePersonDraft[] {
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

export function distributeShareEqually(amountCents: number, people: SharePersonDraft[]): SharePersonDraft[] {
  if (people.length === 0) return people;
  const participantAmount = Math.floor(amountCents / people.length);
  const participantsTotal = participantAmount * (people.length - 1);
  return people.map((person, index) => ({
    ...person,
    amount: formatShareCents(index === 0 ? amountCents - participantsTotal : participantAmount),
  }));
}

export function resetSharePeopleForMode(mode: ShareMode, amountCents: number, people: SharePersonDraft[]): SharePersonDraft[] {
  const resetPeople = people.map((person) => ({ ...person, parts: 1, amount: '' }));
  return mode === 'equal'
    ? distributeShareEqually(amountCents, resetPeople)
    : mode === 'parts'
      ? distributeShareByParts(amountCents, resetPeople)
      : resetPeople;
}

export function totalShareCents(people: SharePersonDraft[]): number {
  return people.reduce((total, person) => total + parseShareCents(person.amount), 0);
}

export function matchesSharePerson(person: SharingPersonSuggestion, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return person.name.toLowerCase().includes(normalized) || Boolean(person.email?.toLowerCase().includes(normalized));
}
