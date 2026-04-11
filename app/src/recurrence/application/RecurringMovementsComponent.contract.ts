import type { RecurrenceMovementItem } from '../../shared/domain/corePort';
import type { RecurrenceGatewayPort } from '../infrastructure/recurrenceGateway';

export type RecurringMovementsComponentRequired = {
  context: {
    core: RecurrenceGatewayPort;
    accountId: string | null;
  };
  config: {
    enabled: boolean;
    refreshSignal?: boolean;
  };
};

export type RecurringMovementsComponentProvided = {
  events?: {
    onChanged?: () => void;
    onError?: (error: { message: string }) => void;
  };
};

export type RecurringMovementsModel = {
  loading: boolean;
  error: string;
  items: RecurrenceMovementItem[];
  deactivatingId: string;
  deactivate: (recurringMovementId: string) => Promise<void>;
  reload: () => Promise<void>;
};

export type RecurringMovementsComponentProps = {
  required: RecurringMovementsComponentRequired;
  provided?: RecurringMovementsComponentProvided;
};
