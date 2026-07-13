import { describe, expect, it } from 'vitest';
import type { InterpretationResult } from '../../../core/application/interpretation/schemaGuidedInterpretationContract';
import { InterpretationResultToMovementEntryDraftMapper } from './interpretationResultToMovementEntryDraftMapper';
import {
  GONEZO_MOVEMENT_ENTRY_SPEC_ID,
  GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
  MOVEMENT_ENTRY_INTERPRETATION_FIELDS,
} from './movementEntryInterpretationContract';

describe('InterpretationResultToMovementEntryDraftMapper', () => {
  it('maps a complete result into a movement draft', () => {
    const mapper = new InterpretationResultToMovementEntryDraftMapper();
    const draft = mapper.map(result());

    expect(draft).toEqual({
      type: 'expense',
      amount: '12.50',
      occurredOn: '2026-07-14',
      note: 'Lunch at the bakery',
      categoryId: 'cat-food',
      issues: [],
    });
  });

  it('does not coerce low-confidence values into confirmed data', () => {
    const mapper = new InterpretationResultToMovementEntryDraftMapper(0.8);
    const draft = mapper.map({
      ...result(),
      fields: result().fields.map((field) => (
        field.key === 'amount'
          ? {
              ...field,
              interpretation: {
                kind: 'resolved',
                candidate: {
                  value: { type: 'decimal', value: '12.50' },
                  confidence: 0.2,
                },
              },
            }
          : field
      )),
    });

    expect(draft.amount).toBeUndefined();
    expect(draft.issues).toContainEqual({ field: 'amount', code: 'confidence_insufficient' });
  });

  it('rejects results for other schemas or versions', () => {
    const mapper = new InterpretationResultToMovementEntryDraftMapper();

    expect(() => mapper.map({
      ...result(),
      specId: 'other-spec',
    })).toThrow('interpretation result schema does not match the movement entry contract');

    expect(() => mapper.map({
      ...result(),
      specVersion: '2',
    })).toThrow('interpretation result schema does not match the movement entry contract');
  });

  it('does not mark optional missing fields as field_missing', () => {
    const mapper = new InterpretationResultToMovementEntryDraftMapper();
    const draft = mapper.map({
      specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
      specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
      fields: [
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn, { type: 'date', value: '2026-07-14' }),
      ],
      issues: [],
    });

    expect(draft.issues).toEqual([]);
    expect(draft).toMatchObject({
      occurredOn: '2026-07-14',
    });
  });

  function result(): InterpretationResult {
    return {
      specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
      specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
      fields: [
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type, { type: 'enum', value: 'expense' }),
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount, { type: 'decimal', value: '12.50' }),
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn, { type: 'date', value: '2026-07-14' }),
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.note, { type: 'text', value: 'Lunch at the bakery' }),
        resolved(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.categoryId, { type: 'enum', value: 'cat-food' }),
      ],
      issues: [],
    };
  }

  function resolved(
    key: string,
    value: { type: 'text' | 'decimal' | 'date' | 'enum' | 'boolean' | 'integer'; value: string | number | boolean },
  ): InterpretationResult['fields'][number] {
    return {
      key,
      interpretation: {
        kind: 'resolved',
        candidate: {
          value,
          confidence: 0.9,
        },
      },
    };
  }
});
