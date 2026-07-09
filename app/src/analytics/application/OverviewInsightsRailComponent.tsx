import { useEffect, useMemo, useState } from 'react';
import type {
  AnalyticsOverviewInsightsInput,
  AnalyticsOverviewInsightsResult,
} from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { OverviewInsightsRailView } from '../ui/OverviewInsightsRail/OverviewInsightsRailView';
import { presentOverviewInsightsRail } from '../ui/OverviewInsightsRail/overviewInsightsPresentation';

export type OverviewInsightsRailPort = {
  analyticsGetOverviewInsights(input: AnalyticsOverviewInsightsInput): Promise<AnalyticsOverviewInsightsResult>;
};

export type OverviewInsightsRailComponentProps = {
  required: {
    context: {
      core: OverviewInsightsRailPort;
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

function emptyInsights(): AnalyticsOverviewInsightsResult {
  return { items: [] };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function OverviewInsightsRailComponent({ required, provided }: OverviewInsightsRailComponentProps) {
  const [result, setResult] = useState<AnalyticsOverviewInsightsResult>(emptyInsights);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;

  useEffect(() => {
    if (!enabled || !currency) {
      setResult(emptyInsights());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadInsights() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetOverviewInsights({ currency, filters });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
          setResult(emptyInsights());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInsights();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, filters, onError, refreshSignal]);

  const items = useMemo(() => presentOverviewInsightsRail(result, currency || 'USD'), [currency, result]);

  return (
    <OverviewInsightsRailView
      required={{
        data: { items },
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
