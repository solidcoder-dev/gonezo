import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  SchedulingCorePort,
} from './schedulingCore.port';

export type SchedulingGatewayPort = SchedulingCorePort & {
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
};
