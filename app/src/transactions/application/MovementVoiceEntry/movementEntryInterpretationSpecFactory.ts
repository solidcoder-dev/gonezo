import type {
  InterpretationAllowedValue,
  InterpretationFieldSpec,
  InterpretationSpec,
} from '../../../core/application/interpretation/schemaGuidedInterpretationContract';
import type { MovementEntryCategoryOption } from './MovementEntryDraftInterpreterPort';
import {
  GONEZO_MOVEMENT_ENTRY_SPEC_ID,
  GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
  MOVEMENT_ENTRY_INTERPRETATION_FIELDS,
} from './movementEntryInterpretationContract';

export class MovementEntryInterpretationSpecFactory {
  create(categories: ReadonlyArray<MovementEntryCategoryOption>): InterpretationSpec {
    const fields: InterpretationFieldSpec[] = [
      field(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type, 'Financial direction expressed by the user', 'enum', [
        { stableValue: 'expense', label: 'Expense' },
        { stableValue: 'income', label: 'Income' },
      ], true),
      field(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount, 'Monetary amount explicitly mentioned by the user', 'decimal', [], true),
      field(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn, 'Date when the event happened', 'date', [], false, 'local-date'),
      field(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.note, 'Short note describing the movement', 'text'),
    ];

    if (categories.length > 0) {
      fields.push(field(
        MOVEMENT_ENTRY_INTERPRETATION_FIELDS.categoryId,
        'Best matching category identifier among the supplied category candidates',
        'enum',
        categories.map((category) => ({
          stableValue: category.id,
          label: category.label,
        })),
      ));
    }

    return {
      id: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
      version: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
      fields,
    };
  }
}

function field(
  key: string,
  description: string,
  type: InterpretationFieldSpec['type'],
  allowedValues: ReadonlyArray<InterpretationAllowedValue> = [],
  required = false,
  format?: string,
): InterpretationFieldSpec {
  return {
    key,
    description,
    type,
    required,
    ...(allowedValues.length > 0 ? { allowedValues } : {}),
    ...(format ? { format } : {}),
  };
}
