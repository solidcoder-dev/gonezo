import { useMemo, useState } from 'react';
import {
  DEFAULT_SHARE_PEOPLE_OPTIONS,
  distributeShareByParts,
  makeSharePerson,
  parseShareCents,
  projectShareGroups,
  projectSharePeople,
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
  const [selectionContext, setSelectionContextState] = useState<'people' | 'groups'>('people');
  const [people, setPeople] = useState<ShareMemberDraft[]>(() => input.draft?.people.map((person) => person.role === 'owner' ? { ...person, includedInAllocation: person.includedInAllocation !== false } : person) ?? resetSharePeopleForMode('parts', amountCents, [{
    id: 'owner', role: 'owner', name: 'You (Payer)', includedInAllocation: true, parts: 1, amount: '', avatarTone: 'you',
  }]));

  const normalizedQuery = query.trim();
  const existingIds = useMemo(() => new Set(people.flatMap((person) => person.role === 'participant' && person.personId ? [person.personId] : [])), [people]);
  const selectionPeople = useMemo(() => projectSharePeople(peopleOptions, normalizedQuery), [normalizedQuery, peopleOptions]);
  const matchingPeople = selectionPeople;
  const matchingGroups = useMemo(() => projectShareGroups(input.groupSuggestions ?? [], normalizedQuery, existingIds), [existingIds, input.groupSuggestions, normalizedQuery]);
  const totalCents = totalShareCents(people);
  const remainingCents = amountCents - totalCents;

  function replacePeople(nextPeople: ShareMemberDraft[]) {
    setPeople(resetSharePeopleForMode(mode, amountCents, nextPeople));
  }

  function setSelectionContext(context: 'people' | 'groups') {
    setSelectionContextState(context);
    setQuery('');
  }

  function addPerson(person: SharingPersonSuggestion) {
    if (existingIds.has(person.id)) return;
    const next = { ...makeSharePerson(person.name, peopleOptions), role: 'participant' as const, personId: person.id };
    replacePeople(insertBeforeOwner(next));
    setQuery('');
  }

  function addGroup(group: SharingGroupSuggestion) {
    const additions = group.people.filter((person) => !existingIds.has(person.id)).map((person) => ({
      ...makeSharePerson(person.name, peopleOptions), role: 'participant' as const, personId: person.id,
    }));
    if (additions.length > 0) replacePeople(additions.reduceRight((current, person) => insertBeforeOwner(person, current), people));
    setQuery('');
  }

  function addTypedPerson(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || people.some((person) => person.name.trim().toLowerCase() === normalized)) return;
    replacePeople(insertBeforeOwner(makeSharePerson(name, peopleOptions)));
    setQuery('');
  }

  function removePerson(id: string) {
    const person = people.find((candidate) => candidate.id === id);
    if (person?.role === 'owner') {
      setOwnerIncluded(false);
      return;
    }
    replacePeople(people.filter((person) => person.id !== id));
  }

  function insertBeforeOwner(person: ShareMemberDraft, currentPeople = people): ShareMemberDraft[] {
    const ownerIndex = currentPeople.findIndex((candidate) => candidate.role === 'owner');
    if (ownerIndex < 0) return [...currentPeople, person];
    return [...currentPeople.slice(0, ownerIndex + 1), person, ...currentPeople.slice(ownerIndex + 1)];
  }

  function setOwnerIncluded(included: boolean) {
    replacePeople(people.map((person) => person.role === 'owner' ? { ...person, includedInAllocation: included } : person));
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
    valid: remainingCents === 0 && people.some((person) => person.role === 'participant') && people.every((person) => Number.isFinite(parseShareCents(person.amount))),
    message: remainingCents < 0
      ? `Remove ${Math.abs(remainingCents / 100).toFixed(2)} ${input.amount.replace(/[\d.,\s-]/g, '')} from the allocation.`
      : remainingCents > 0 ? `Assign ${(remainingCents / 100).toFixed(2)} more.` : undefined,
  };

  return {
    state: { mode, selectionContext, query, people, availablePeople: peopleOptions, matchingPeople, selectionPeople, matchingGroups, canCreatePerson: normalizedQuery.length > 0 && !peopleOptions.some((person) => person.name.trim().toLowerCase() === normalizedQuery.toLowerCase()), movementType: input.movementType },
    commands: { setQuery, setSelectionContext, selectMode, addPerson, addGroup, addTypedPerson, removePerson, setOwnerIncluded, restorePeople, updateParts, updateAmount, updateSettlement },
    validation,
  };
}
