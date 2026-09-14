import { useMemo, useState } from 'react';
import {
  DEFAULT_SHARE_PEOPLE_OPTIONS,
  distributeShareByParts,
  makeSharePerson,
  matchesSharePerson,
  parseShareCents,
  resetSharePeopleForMode,
  totalShareCents,
} from './shareDraftCalculator';
import type { ShareDraft, ShareMemberDraft, ShareMode, ShareSettlementChoice, SharingGroupSuggestion, SharingPersonSuggestion } from '../domain/shareDraft';

type UseShareEditorModelInput = {
  readonly amount: string;
  readonly draft?: ShareDraft;
  readonly movementType: 'expense' | 'income';
  readonly peopleSuggestions?: readonly SharingPersonSuggestion[];
  readonly groupSuggestions?: readonly SharingGroupSuggestion[];
  readonly disabled: boolean;
};

export function useShareEditorModel(input: UseShareEditorModelInput) {
  const amountCents = parseShareCents(input.amount);
  const peopleOptions = input.peopleSuggestions?.length ? input.peopleSuggestions : DEFAULT_SHARE_PEOPLE_OPTIONS;
  const [mode, setMode] = useState<ShareMode>(input.draft?.mode ?? 'parts');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<ShareMemberDraft[]>(() => input.draft?.people ?? resetSharePeopleForMode('parts', amountCents, [{
    id: 'owner', role: 'owner', name: 'You (Payer)', parts: 1, amount: '', avatarTone: 'you',
  }]));

  const normalizedQuery = query.trim();
  const existingIds = useMemo(() => new Set(people.flatMap((person) => person.role === 'participant' && person.personId ? [person.personId] : [])), [people]);
  const matchingPeople = useMemo(() => peopleOptions
    .filter((person) => !existingIds.has(person.id))
    .filter((person) => normalizedQuery.length > 0 && matchesSharePerson(person, normalizedQuery))
    .slice(0, 5), [existingIds, normalizedQuery, peopleOptions]);
  const selectionPeople = useMemo(() => peopleOptions
    .filter((person) => normalizedQuery.length === 0 || matchesSharePerson(person, normalizedQuery)), [normalizedQuery, peopleOptions]);
  const matchingGroups = useMemo(() => (input.groupSuggestions ?? [])
    .filter((group) => normalizedQuery.length === 0 || group.people.some((person) => matchesSharePerson(person, normalizedQuery)))
    .filter((group) => group.people.some((person) => !existingIds.has(person.id))), [existingIds, input.groupSuggestions, normalizedQuery]);
  const totalCents = totalShareCents(people);
  const remainingCents = amountCents - totalCents;

  function replacePeople(nextPeople: ShareMemberDraft[]) {
    setPeople(resetSharePeopleForMode(mode, amountCents, nextPeople));
  }

  function addPerson(person: SharingPersonSuggestion) {
    if (existingIds.has(person.id)) return;
    const next = { ...makeSharePerson(person.name, peopleOptions), role: 'participant' as const, personId: person.id };
    replacePeople([people[0], next, ...people.slice(1)]);
    setQuery('');
  }

  function addGroup(group: SharingGroupSuggestion) {
    const additions = group.people.filter((person) => !existingIds.has(person.id)).map((person) => ({
      ...makeSharePerson(person.name, peopleOptions), role: 'participant' as const, personId: person.id,
    }));
    if (additions.length > 0) replacePeople([people[0], ...additions, ...people.slice(1)]);
    setQuery('');
  }

  function addTypedPerson(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || people.some((person) => person.name.trim().toLowerCase() === normalized)) return;
    replacePeople([people[0], makeSharePerson(name, peopleOptions), ...people.slice(1)]);
    setQuery('');
  }

  function removePerson(id: string) {
    replacePeople(people.filter((person) => person.id !== id));
  }

  function restorePeople(nextPeople: ShareMemberDraft[]) {
    setPeople(nextPeople);
  }

  function selectMode(nextMode: ShareMode) {
    setMode(nextMode);
    setPeople(resetSharePeopleForMode(nextMode, amountCents, people));
  }

  function updateParts(id: string, parts: number) {
    setPeople(distributeShareByParts(amountCents, people.map((person) => person.id === id ? { ...person, parts: Math.max(1, parts) } : person)));
  }

  function updateAmount(id: string, amount: string) {
    setPeople(people.map((person) => person.id === id ? { ...person, amount } : person));
  }

  function updateSettlement(id: string, settlementChoice: ShareSettlementChoice) {
    setPeople(people.map((person) => person.id === id && person.role === 'participant' ? { ...person, settlementChoice } : person));
  }

  const validation = {
    totalCents,
    remainingCents,
    exceedsTotal: remainingCents < 0,
    valid: remainingCents === 0 && people.every((person) => Number.isFinite(parseShareCents(person.amount))),
    message: remainingCents < 0
      ? `Remove ${Math.abs(remainingCents / 100).toFixed(2)} ${input.amount.replace(/[\d.,\s-]/g, '')} from the allocation.`
      : remainingCents > 0 ? `Assign ${(remainingCents / 100).toFixed(2)} more.` : undefined,
  };

  return {
    state: { mode, query, people, availablePeople: peopleOptions, matchingPeople, selectionPeople, matchingGroups, movementType: input.movementType },
    commands: { setQuery, selectMode, addPerson, addGroup, addTypedPerson, removePerson, restorePeople, updateParts, updateAmount, updateSettlement },
    validation,
  };
}
