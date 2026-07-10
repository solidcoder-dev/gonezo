import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsFlowUpcomingInput, AnalyticsFlowUpcomingResult } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { FlowUpcomingCardsView } from '../ui/FlowUpcomingCards/FlowUpcomingCardsView';
import type { FlowUpcomingItemView } from '../ui/FlowUpcomingCards/FlowUpcomingCardsView.contract';

export type FlowUpcomingCardsPort = {
  analyticsGetFlowUpcoming(input: AnalyticsFlowUpcomingInput): Promise<AnalyticsFlowUpcomingResult>;
};

export type FlowUpcomingCardsComponentProps = {
  required: {
    context: {
      core: FlowUpcomingCardsPort;
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function emptyUpcoming(): AnalyticsFlowUpcomingResult {
  return { incomeItems: [], expenseItems: [] };
}

function toItems(
  items: AnalyticsFlowUpcomingResult['incomeItems'],
  currency: string,
  sign: '+' | '-' | '',
): FlowUpcomingItemView[] {
  return items.map((item) => ({
    movementId: item.movementId,
    title: item.title,
    amount: `${sign}${formatCurrencyAmount(item.amount, currency)}`,
    occurredAt: item.occurredAt,
  }));
}

export function FlowUpcomingCardsComponent({ required, provided }: FlowUpcomingCardsComponentProps) {
  const { core } = required.context;
  const onError = provided?.events?.onError;
  const [result, setResult] = useState<AnalyticsFlowUpcomingResult>(emptyUpcoming());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!required.config.enabled || !required.config.currency) {
      setLoading(false);
      setResult(emptyUpcoming());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetFlowUpcoming({
          currency: required.config.currency,
          filters: required.config.filters,
        });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
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
  }, [core, onError, required.config.currency, required.config.enabled, required.config.filters, required.config.refreshSignal]);

  const data = useMemo(() => ({
    incomingTotalAmount: `+${formatCurrencyAmount(result.incomeItems.reduce((total, item) => Number(total) + Number(item.amount), 0).toFixed(2), required.config.currency || 'USD')}`,
    outgoingTotalAmount: `-${formatCurrencyAmount(result.expenseItems.reduce((total, item) => Number(total) + Number(item.amount), 0).toFixed(2), required.config.currency || 'USD')}`,
    incoming: toItems(result.incomeItems, required.config.currency || 'USD', '+'),
    outgoing: toItems(result.expenseItems, required.config.currency || 'USD', '-'),
  }), [required.config.currency, result]);

  return (
    <FlowUpcomingCardsView
      required={{
        data,
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
