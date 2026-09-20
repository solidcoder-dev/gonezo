import { describe, expect, it } from 'vitest';
import { resolveSchedulingKind } from './schedulingKind';

describe('resolveSchedulingKind', () => {
  it('classifies a plan ending after one occurrence as one shot', () => {
    expect(resolveSchedulingKind({ recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 1 } })).toBe('one_shot');
  });

  it('classifies every other current plan as recurring', () => {
    expect(resolveSchedulingKind({ recurrenceEnd: { kind: 'after_occurrences', afterOccurrences: 2 } })).toBe('recurring');
    expect(resolveSchedulingKind({ recurrenceEnd: { kind: 'never' } })).toBe('recurring');
  });
});
