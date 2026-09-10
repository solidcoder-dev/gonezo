import { describe, expect, it } from 'vitest';
import { distributeShareEqually, distributeShareByParts } from './shareDraftCalculator';

const people = [
  { id: 'owner', name: 'You', amount: '', parts: 1, reimbursable: false, avatarTone: 'you' as const },
  { id: 'alex', name: 'Alex', amount: '', parts: 1, reimbursable: true, avatarTone: 'custom' as const },
  { id: 'sam', name: 'Sam', amount: '', parts: 1, reimbursable: true, avatarTone: 'custom' as const },
];

describe('share allocation calculations', () => {
  it('lets the owner absorb the rounding cent for equal allocations', () => {
    expect(distributeShareEqually(100, people).map((person) => person.amount)).toEqual(['0.34', '0.33', '0.33']);
  });

  it('lets the owner absorb the rounding cent for parts allocations', () => {
    expect(distributeShareByParts(100, people).map((person) => person.amount)).toEqual(['0.34', '0.33', '0.33']);
  });
});
