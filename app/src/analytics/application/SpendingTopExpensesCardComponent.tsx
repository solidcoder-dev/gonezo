import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount, formatIsoDate } from '../../shared/utils/formatting';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type {
  AnalyticsSpendingTopExpensesInput,
  AnalyticsSpendingTopExpensesResult,
} from './analytics.port';
import { SpendingTopExpensesCardView } from '../ui/SpendingTopExpensesCard/SpendingTopExpensesCardView';
import type { SpendingTopExpenseView } from '../ui/SpendingTopExpensesCard/SpendingTopExpensesCardView.contract';

export type SpendingTopExpensesCardPort = {
  analyticsGetSpendingTopExpenses(input: AnalyticsSpendingTopExpensesInput): Promise<AnalyticsSpendingTopExpensesResult>;
};

export type SpendingTopExpensesCardComponentProps = {
  required: {
    context: {
      core: SpendingTopExpensesCardPort;
    };
    config: {
      enabled: boolean;
      currency: string;
      filters?: AnalyticsFiltersInput;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
    };
  };
};

function emptyTopExpenses(): AnalyticsSpendingTopExpensesResult {
  return {
    currentWindow: { label: '', startDate: '', endDate: '' },
    items: [],
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toItemViews(result: AnalyticsSpendingTopExpensesResult, currency: string): SpendingTopExpenseView[] {
  return result.items.map((item) => ({
    key: item.movementId,
    title: item.title,
    amount: `-${formatCurrencyAmount(item.amount, currency)}`,
    occurredAtLabel: formatIsoDate(item.occurredAt),
  }));
}

export function SpendingTopExpensesCardComponent({ required, provided }: SpendingTopExpensesCardComponentProps) {
  const [result, setResult] = useState<AnalyticsSpendingTopExpensesResult>(emptyTopExpenses);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;

  useEffect(() => {
    if (!enabled || !currency) {
      setResult(emptyTopExpenses());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetSpendingTopExpenses({ currency, filters });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
          setResult(emptyTopExpenses());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, filters, onError, refreshSignal]);

  const items = useMemo(() => toItemViews(result, currency || 'USD'), [currency, result]);

  return (
    <SpendingTopExpensesCardView
      required={{
        data: { items },
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
