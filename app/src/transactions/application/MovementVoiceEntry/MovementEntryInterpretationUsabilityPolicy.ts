import type { InterpretationResult } from '../../../core/application/interpretation/schemaGuidedInterpretationContract';

export type MovementEntryInterpretationUsability =
  | 'USABLE'
  | 'NO_USABLE_FIELDS';

export interface MovementEntryInterpretationUsabilityPolicy {
  evaluate(result: InterpretationResult): MovementEntryInterpretationUsability;
}

export class DefaultMovementEntryInterpretationUsabilityPolicy implements MovementEntryInterpretationUsabilityPolicy {
  evaluate(result: InterpretationResult): MovementEntryInterpretationUsability {
    return result.fields.some((field) => field.interpretation.kind === 'resolved')
      ? 'USABLE'
      : 'NO_USABLE_FIELDS';
  }
}
