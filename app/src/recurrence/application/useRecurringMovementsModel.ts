import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RecurrenceMovementItem } from '../../shared/domain/corePort';
import { createRecurrenceGateway } from '../infrastructure/recurrenceGateway';
import type {
  RecurringMovementsComponentProvided,
  RecurringMovementsComponentRequired,
  RecurringMovementsModel,
} from './RecurringMovementsComponent.contract';

type Input = {
  required: RecurringMovementsComponentRequired;
  provided?: RecurringMovementsComponentProvided;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useRecurringMovementsModel(input: Input): RecurringMovementsModel {
  const { required, provided } = input;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<RecurrenceMovementItem[]>([]);
  const [deactivatingId, setDeactivatingId] = useState('');

  const gateway = useMemo(() => createRecurrenceGateway(required.context.core), [required.context.core]);

  const reload = useCallback(async () => {
    if (!required.config.enabled || !required.context.accountId) {
      setItems([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await gateway.recurrenceListRecurringMovements({
        sourceAccountId: required.context.accountId,
      });
      setItems(result.items);
    } catch (rawError) {
      const message = toErrorMessage(rawError);
      setError(message);
      provided?.events?.onError?.({ message });
    } finally {
      setLoading(false);
    }
  }, [
    gateway,
    provided,
    required.config.enabled,
    required.context.accountId,
  ]);

  useEffect(() => {
    void reload();
  }, [reload, required.config.refreshSignal]);

  const deactivate = useCallback(async (recurringMovementId: string) => {
    setDeactivatingId(recurringMovementId);
    setError('');
    try {
      await gateway.recurrenceDeactivateRecurringMovement({
        recurringMovementId,
      });
      await reload();
      provided?.events?.onChanged?.();
    } catch (rawError) {
      const message = toErrorMessage(rawError);
      setError(message);
      provided?.events?.onError?.({ message });
    } finally {
      setDeactivatingId('');
    }
  }, [gateway, provided, reload]);

  return {
    loading,
    error,
    items,
    deactivatingId,
    deactivate,
    reload,
  };
}
