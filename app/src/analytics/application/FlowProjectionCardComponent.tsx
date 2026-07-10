import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsFlowProjectionInput, AnalyticsFlowProjectionResult } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { FlowProjectionCardView } from '../ui/FlowProjectionCard/FlowProjectionCardView';

export type FlowProjectionCardPort = {
  analyticsGetFlowProjection(input: AnalyticsFlowProjectionInput): Promise<AnalyticsFlowProjectionResult>;
};

export type FlowProjectionCardComponentProps = {
  required: {
    context: {
      core: FlowProjectionCardPort;
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

function emptyProjection(): AnalyticsFlowProjectionResult {
  return {
    currentWindow: { label: '', startDate: '', endDate: '' },
    window: { label: '', periodOffset: 0, canGoPrevious: false, canGoNext: false },
    currentBalanceAmount: '0.00',
    expectedEndBalanceAmount: '0.00',
    lowestPointAmount: '0.00',
    lowestPointLabel: '',
    currentMarkerLabel: '',
    points: [],
  };
}

export function FlowProjectionCardComponent({ required, provided }: FlowProjectionCardComponentProps) {
  const { core } = required.context;
  const onError = provided?.events?.onError;
  const [periodOffset, setPeriodOffset] = useState(0);
  const [result, setResult] = useState<AnalyticsFlowProjectionResult>(emptyProjection());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPeriodOffset(0);
  }, [required.config.currency, required.config.filters]);

  useEffect(() => {
    if (!required.config.enabled || !required.config.currency) {
      setLoading(false);
      setResult(emptyProjection());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetFlowProjection({
          currency: required.config.currency,
          filters: required.config.filters,
          periodOffset,
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
  }, [core, onError, periodOffset, required.config.currency, required.config.enabled, required.config.filters, required.config.refreshSignal]);

  const points = useMemo(
    () => result.points.map((point) => ({
      key: point.periodKey,
      label: point.label,
      postedBalanceAmount: point.postedBalanceAmount != null ? Number(point.postedBalanceAmount) : undefined,
      scheduledBalanceAmount: point.scheduledBalanceAmount != null ? Number(point.scheduledBalanceAmount) : undefined,
      expectedBalanceAmount: Number(point.expectedBalanceAmount),
    })),
    [result.points],
  );

  return (
    <FlowProjectionCardView
      required={{
        data: {
          windowLabel: result.window.label,
          currentMarkerLabel: result.currentMarkerLabel,
          currentBalanceAmount: formatCurrencyAmount(result.currentBalanceAmount, required.config.currency || 'USD'),
          expectedEndBalanceAmount: formatCurrencyAmount(result.expectedEndBalanceAmount, required.config.currency || 'USD'),
          lowestPointAmount: formatCurrencyAmount(result.lowestPointAmount, required.config.currency || 'USD'),
          lowestPointLabel: result.lowestPointLabel,
          points,
        },
        state: {
          canGoPreviousWindow: result.window.canGoPrevious,
          canGoNextWindow: result.window.canGoNext,
        },
        status: { loading },
      }}
      provided={{
        commands: {
          goToPreviousWindow: () => setPeriodOffset((current) => current - 1),
          goToNextWindow: () => setPeriodOffset((current) => Math.min(0, current + 1)),
        },
      }}
    />
  );
}
