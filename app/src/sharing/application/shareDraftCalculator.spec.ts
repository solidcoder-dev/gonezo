import { describe, expect, it } from 'vitest';
import {
  distributeShareEqually,
  distributeShareByParts,
  makeSharePerson,
  resetSharePeopleForMode,
  totalShareCents,
  projectShareGroups,
  projectSharePeople,
} from './shareDraftCalculator';

const people = [
  { id: 'owner', role: 'owner' as const, name: 'You', amount: '', parts: 1, avatarTone: 'you' as const },
  { id: 'alex', role: 'participant' as const, name: 'Alex', amount: '', parts: 1, settlementChoice: 'pending' as const, avatarTone: 'custom' as const },
  { id: 'sam', role: 'participant' as const, name: 'Sam', amount: '', parts: 1, settlementChoice: 'pending' as const, avatarTone: 'custom' as const },
];

describe('share allocation calculations', () => {
  it('lets the owner absorb the rounding cent for equal allocations', () => {
    expect(distributeShareEqually(100, people).map((person) => person.amount)).toEqual(['0.34', '0.33', '0.33']);
  });

  it('lets the owner absorb the rounding cent for parts allocations', () => {
    expect(distributeShareByParts(100, people).map((person) => person.amount)).toEqual(['0.34', '0.33', '0.33']);
  });

  it('creates a new person with a unique draft identity', () => {
    const first = makeSharePerson('Nora');
    const second = makeSharePerson('Nora');

    expect(first.name).toBe('Nora');
    expect(first.role).toBe('participant');
    expect(first.personId).toBeUndefined();
    expect(first.id).not.toBe(second.id);
  });

  it('reuses the stable identity of an existing person', () => {
    const person = makeSharePerson(' alex ', [{ id: 'person-1', name: 'Alex' }]);

    expect(person.role === 'participant' ? person.personId : undefined).toBe('person-1');
    expect(person.name).toBe('Alex');
  });

  it('keeps one owner row when a share is recalculated', () => {
    const recalculated = resetSharePeopleForMode('parts', 1000, people);

    expect(recalculated[0].id).toBe('owner');
    expect(recalculated.filter((person) => person.id === 'owner')).toHaveLength(1);
    expect(totalShareCents(recalculated)).toBe(1000);
  });

  it('preserves a zero amount participant in the calculated draft', () => {
    const zeroParticipant = { ...people[1], amount: '0.00' };
    const recalculated = resetSharePeopleForMode('amounts', 1000, [people[0], zeroParticipant]);

    expect(recalculated.map((person) => person.id)).toEqual(['owner', 'alex']);
    expect(recalculated[1].amount).toBe('');
  });

  it('limits empty people projections while preserving gateway order', () => {
    const suggestions = Array.from({ length: 7 }, (_, index) => ({ id: `person-${index}`, name: `Person ${index}` }));
    expect(projectSharePeople(suggestions, '').map((person) => person.id)).toEqual(['person-0', 'person-1', 'person-2', 'person-3', 'person-4']);
  });

  it('matches groups through member names and limits empty group projections', () => {
    const groups = Array.from({ length: 7 }, (_, index) => ({ key: `group-${index}`, people: [{ id: `person-${index}`, name: `Person ${index}` }], usageCount: 1, lastUsedAt: '2026-01-01T00:00:00Z' }));
    expect(projectShareGroups(groups, 'Person 6', new Set()).map((group) => group.key)).toEqual(['group-6']);
    expect(projectShareGroups(groups, '', new Set()).map((group) => group.key)).toEqual(['group-0', 'group-1', 'group-2', 'group-3', 'group-4']);
  });
});
