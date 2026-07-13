import { describe, expect, it } from 'vitest';
import { MovementEntryInterpretationSpecFactory } from './movementEntryInterpretationSpecFactory';
import {
  GONEZO_MOVEMENT_ENTRY_SPEC_ID,
  GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
  MOVEMENT_ENTRY_INTERPRETATION_FIELDS,
} from './movementEntryInterpretationContract';

describe('MovementEntryInterpretationSpecFactory', () => {
  it('creates the movement entry schema with dynamic categories', () => {
    const spec = new MovementEntryInterpretationSpecFactory().create([
      { id: 'cat-food', label: 'Food', description: 'Meals and groceries' },
      { id: 'cat-salary', label: 'Salary' },
    ]);

    expect(spec.id).toBe(GONEZO_MOVEMENT_ENTRY_SPEC_ID);
    expect(spec.version).toBe(GONEZO_MOVEMENT_ENTRY_SPEC_VERSION);
    expect(spec.fields.map((field) => field.key)).toEqual(Object.values(MOVEMENT_ENTRY_INTERPRETATION_FIELDS));
    expect(spec.fields.find((field) => field.key === MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type)?.required).toBe(true);
    expect(spec.fields.find((field) => field.key === MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount)?.required).toBe(true);
    expect(spec.fields.find((field) => field.key === MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn)?.required).toBe(false);
    const requiredOptionalFields: string[] = [
      MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type,
      MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount,
      MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn,
    ];
    expect(spec.fields.filter((field) => !requiredOptionalFields.includes(field.key)).every((field) => field.required === false)).toBe(true);
    expect(spec.fields.find((field) => field.key === 'categoryId')?.allowedValues?.map((value) => value.stableValue))
      .toEqual(['cat-food', 'cat-salary']);
  });
});
