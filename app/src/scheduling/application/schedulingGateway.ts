import type { SchedulingGatewayPort } from '../application/schedulingGateway.port';

export type { SchedulingGatewayPort } from '../application/schedulingGateway.port';

export function createSchedulingGateway(core: SchedulingGatewayPort): SchedulingGatewayPort {
  return {
    schedulingCreateMovement: (input) => core.schedulingCreateMovement(input),
    schedulingUpdateMovement: (input) => core.schedulingUpdateMovement(input),
    schedulingDeactivateMovement: (input) => core.schedulingDeactivateMovement(input),
    schedulingListMovements: (input) => core.schedulingListMovements(input),
    schedulingProcessDueMovements: (input) => (
      core.schedulingProcessDueMovements?.(input) ?? Promise.resolve({
        scanned: 0,
        posted: 0,
        expectedCreated: 0,
        failed: 0,
        advancedSchedules: 0,
      })
    ),
    movementsGetOverview: (input) => core.movementsGetOverview(input),
    movementsListScheduled: (input) => core.movementsListScheduled(input),
  };
}
