import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsFlowInsightsInput, AnalyticsFlowInsightsResult } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { FlowInsightsRailView } from '../ui/FlowInsightsRail/FlowInsightsRailView';
import type { FlowInsightsRailItemView } from '../ui/FlowInsightsRail/FlowInsightsRailView.contract';

export type FlowInsightsRailPort = {
  analyticsGetFlowInsights(input: AnalyticsFlowInsightsInput): Promise<AnalyticsFlowInsightsResult>;
};

export type FlowInsightsRailComponentProps = {
  required: {
    context: {
      core: FlowInsightsRailPort;
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

function emptyInsights(): AnalyticsFlowInsightsResult {
  return { items: [] };
}

export function FlowInsightsRailComponent({ required, provided }: FlowInsightsRailComponentProps) {
  const { core } = required.context;
  const onError = provided?.events?.onError;
  const [result, setResult] = useState<AnalyticsFlowInsightsResult>(emptyInsights());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!required.config.enabled || !required.config.currency) {
      setLoading(false);
      setResult(emptyInsights());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetFlowInsights({
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
    items: result.items.map((item): FlowInsightsRailItemView => ({
      key: item.key,
      title: item.title,
      subtitle: item.subtitle,
      amount: formatCurrencyAmount(item.amount, required.config.currency || 'USD'),
      tone: item.tone,
    })),
  }), [required.config.currency, result.items]);

  return (
    <FlowInsightsRailView
      required={{
        data,
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
