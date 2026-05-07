import type {
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
} from '../../shared/domain/corePort';

export type SchedulingGatewayPort = {
  schedulingCreateMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult>;
  schedulingUpdateMovement(
    input: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult>;
  schedulingDeactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void>;
  schedulingListMovements(
    input: SchedulingListMovementsInput,
  ): Promise<SchedulingListMovementsResult>;
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
};

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
