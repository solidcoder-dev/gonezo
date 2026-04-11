import { RecurringMovementsView } from '../ui/RecurringMovementsView';
import type { RecurringMovementsComponentProps } from './RecurringMovementsComponent.contract';
import { useRecurringMovementsModel } from './useRecurringMovementsModel';

export type {
  RecurringMovementsComponentProps,
  RecurringMovementsComponentProvided,
  RecurringMovementsComponentRequired,
} from './RecurringMovementsComponent.contract';

export function RecurringMovementsComponent({ required, provided }: RecurringMovementsComponentProps) {
  const model = useRecurringMovementsModel({ required, provided });

  if (!required.config.enabled || !required.context.accountId) {
    return null;
  }

  return (
    <RecurringMovementsView
      loading={model.loading}
      error={model.error}
      items={model.items}
      deactivatingId={model.deactivatingId}
      onDeactivate={model.deactivate}
    />
  );
}
