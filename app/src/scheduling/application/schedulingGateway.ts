import type { SchedulingGatewayPort } from '../application/schedulingGateway.port';

export type { SchedulingGatewayPort } from '../application/schedulingGateway.port';

export function createSchedulingGateway(core: SchedulingGatewayPort): SchedulingGatewayPort {
  return {
    schedulingCreateMovement: (input) => core.schedulingCreateMovement(input),
    schedulingUpdateMovement: (input) => core.schedulingUpdateMovement(input),
    schedulingDeactivateMovement: (input) => core.schedulingDeactivateMovement(input),
    schedulingListMovements: (input) => core.schedulingListMovements(input),
    movementsGetOverview: (input) => core.movementsGetOverview(input),
    movementsListScheduled: (input) => core.movementsListScheduled(input),
  };
}
