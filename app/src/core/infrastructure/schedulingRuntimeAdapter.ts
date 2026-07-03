import type {
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingProcessDueMovementsInput,
  SchedulingProcessDueMovementsResult,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
} from '../../scheduling/application/scheduling.port';
import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class SchedulingRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  recurrenceCreateRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    return isNativeRuntime()
      ? CorePlugin.recurrenceCreateRecurringMovement(input)
      : this.web.recurrenceCreateRecurringMovement(input);
  }

  async recurrenceDeactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.recurrenceDeactivateRecurringMovement(input);
      return;
    }
    await this.web.recurrenceDeactivateRecurringMovement(input);
  }

  recurrenceListRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    return isNativeRuntime()
      ? CorePlugin.recurrenceListRecurringMovements(input)
      : this.web.recurrenceListRecurringMovements(input);
  }

  schedulingCreateMovement(input: SchedulingCreateMovementInput): Promise<SchedulingCreateMovementResult> {
    return isNativeRuntime() ? CorePlugin.recurrenceCreateRecurringMovement(input) : this.web.schedulingCreateMovement(input);
  }

  schedulingUpdateMovement(input: SchedulingUpdateMovementInput): Promise<SchedulingUpdateMovementResult> {
    return isNativeRuntime() ? CorePlugin.recurrenceUpdateRecurringMovement(input) : this.web.schedulingUpdateMovement(input);
  }

  async schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.recurrenceDeactivateRecurringMovement(input);
      return;
    }
    await this.web.schedulingDeactivateMovement(input);
  }

  async schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    if (isNativeRuntime()) {
      const result = await CorePlugin.recurrenceListRecurringMovements(input);
      return {
        items: result.items.map((item) => {
          const kind = resolveSchedulingKind(item);
          return {
            ...item,
            scheduleKind: kind,
            origin: kind,
          };
        }),
      };
    }
    return this.web.schedulingListMovements(input);
  }

  schedulingProcessDueMovements(
    input: SchedulingProcessDueMovementsInput = {},
  ): Promise<SchedulingProcessDueMovementsResult> {
    if (isNativeRuntime()) {
      return CorePlugin.schedulingProcessDueMovements(input);
    }
    return this.web.schedulingProcessDueMovements?.(input) ?? Promise.resolve({
      scanned: 0,
      posted: 0,
      expectedCreated: 0,
      failed: 0,
      advancedSchedules: 0,
    });
  }
}
