import type {
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
} from '../../shared/domain/corePort';

export type RecurrenceGatewayPort = {
  recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult>;
  recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void>;
  recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult>;
};

export function createRecurrenceGateway(core: RecurrenceGatewayPort): RecurrenceGatewayPort {
  return {
    recurrenceCreateRecurringMovement: (input) => core.recurrenceCreateRecurringMovement(input),
    recurrenceDeactivateRecurringMovement: (input) => core.recurrenceDeactivateRecurringMovement(input),
    recurrenceListRecurringMovements: (input) => core.recurrenceListRecurringMovements(input),
  };
}
