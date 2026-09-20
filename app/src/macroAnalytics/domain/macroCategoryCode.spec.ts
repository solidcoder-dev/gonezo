import { describe, expect, it } from 'vitest';
import { macroCategoryCodeFor } from '../infrastructure/macroCategoryMapper';

describe('macro category mapping', () => {
  it('classifies seeded ids independently of category names', () => {
    expect(macroCategoryCodeFor('00000000-0000-4000-8000-000000000102', 'EXPENSE')).toBe('GROCERIES');
    expect(macroCategoryCodeFor('00000000-0000-4000-8000-000000000102', 'EXPENSE')).toBe('GROCERIES');
  });

  it('maps custom and unknown categories to kind-specific unmapped codes', () => {
    expect(macroCategoryCodeFor('custom', 'EXPENSE')).toBe('UNMAPPED_EXPENSE');
    expect(macroCategoryCodeFor(undefined, 'INCOME')).toBe('UNMAPPED_INCOME');
  });

  it('maps every seeded expense and income id only within its movement kind', () => {
    const seeded = [
      ['101', 'EXPENSE', 'BILLS'], ['102', 'EXPENSE', 'GROCERIES'], ['103', 'EXPENSE', 'DINING'],
      ['104', 'EXPENSE', 'TRANSPORT'], ['105', 'EXPENSE', 'HEALTH'], ['106', 'EXPENSE', 'SHOPPING'],
      ['107', 'EXPENSE', 'ENTERTAINMENT'], ['108', 'EXPENSE', 'TRAVEL'], ['109', 'EXPENSE', 'OTHER_EXPENSE'],
      ['110', 'EXPENSE', 'BEAUTY'], ['111', 'EXPENSE', 'SERVICES'], ['201', 'INCOME', 'WORK_INCOME'],
      ['202', 'INCOME', 'INVESTMENTS'], ['203', 'INCOME', 'REIMBURSEMENTS'], ['204', 'INCOME', 'GIFTS_BENEFITS'],
      ['205', 'INCOME', 'OTHER_INCOME'],
    ] as const;
    for (const [suffix, kind, code] of seeded) {
      expect(macroCategoryCodeFor(`00000000-0000-4000-8000-000000000${suffix}`, kind)).toBe(code);
      expect(macroCategoryCodeFor(`00000000-0000-4000-8000-000000000${suffix}`, kind === 'INCOME' ? 'EXPENSE' : 'INCOME'))
        .toBe(kind === 'INCOME' ? 'UNMAPPED_EXPENSE' : 'UNMAPPED_INCOME');
    }
  });
});
