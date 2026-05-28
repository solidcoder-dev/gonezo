import type {
  SchedulingCorePort,
} from './schedulingCore.port';
import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../movements/application/movementsCore.port';

export type SchedulingGatewayPort = SchedulingCorePort & {
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
};
