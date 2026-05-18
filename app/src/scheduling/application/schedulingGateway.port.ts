import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
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
