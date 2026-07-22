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
  SchedulingGetMovementInput,
  SchedulingGetMovementResult,
  SchedulingMovementItem,
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
        items: result.items.map((item) => normalizeSchedulingMovement(item)),
      };
    }
    const result = await this.web.schedulingListMovements(input);
    return { items: result.items.map((item) => normalizeSchedulingMovement(item)) };
  }

  async schedulingGetMovement(input: SchedulingGetMovementInput): Promise<SchedulingGetMovementResult> {
    const result = isNativeRuntime()
      ? await CorePlugin.schedulingGetMovement(input)
      : await this.web.schedulingGetMovement(input);
    return result.found ? { found: true, item: normalizeSchedulingMovement(result.item) } : result;
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

function normalizeSchedulingMovement(item: SchedulingMovementItem): SchedulingMovementItem {
  const kind = resolveSchedulingKind(item);
  return { ...item, scheduleKind: kind, origin: kind };
}
