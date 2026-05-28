import type {
  SchedulingPort,
} from './scheduling.port';
import type {
  MovementsGetOverviewInput,
  MovementsGetOverviewResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../movements/application/movements.port';

export type SchedulingGatewayPort = SchedulingPort & {
  movementsGetOverview(input: MovementsGetOverviewInput): Promise<MovementsGetOverviewResult>;
  movementsListScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult>;
};
