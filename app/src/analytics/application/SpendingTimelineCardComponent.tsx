import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type { AnalyticsSpendingTimelineInput, AnalyticsSpendingTimelineResult } from './analytics.port';
import { SpendingTimelineCardView } from '../ui/SpendingTimelineCard/SpendingTimelineCardView';
import type { SpendingTimelinePointView } from '../ui/SpendingTimelineCard/SpendingTimelineCardView.contract';

export type SpendingTimelineCardPort = {
  analyticsGetSpendingTimeline(input: AnalyticsSpendingTimelineInput): Promise<AnalyticsSpendingTimelineResult>;
};

export type SpendingTimelineCardComponentProps = {
  required: {
    context: {
      core: SpendingTimelineCardPort;
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

function emptyTimeline(): AnalyticsSpendingTimelineResult {
  return {
    currentWindow: { label: '', startDate: '', endDate: '' },
    window: { label: '', periodOffset: 0, canGoPrevious: false, canGoNext: false },
    points: [],
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toPointViews(result: AnalyticsSpendingTimelineResult): SpendingTimelinePointView[] {
  const maxAmount = Math.max(0, ...result.points.map((point) => Number(point.amount)));
  return result.points.map((point) => ({
    key: point.periodKey,
    label: point.label,
    amount: point.amount,
    heightPercent: maxAmount > 0 ? Math.round((Number(point.amount) / maxAmount) * 100) : 0,
  }));
}

export function SpendingTimelineCardComponent({ required, provided }: SpendingTimelineCardComponentProps) {
  const [result, setResult] = useState<AnalyticsSpendingTimelineResult>(emptyTimeline);
  const [loading, setLoading] = useState(true);
  const [periodOffset, setPeriodOffset] = useState(0);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;

  useEffect(() => {
    setPeriodOffset(0);
  }, [currency, filters]);

  useEffect(() => {
    if (!enabled || !currency) {
      setResult(emptyTimeline());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetSpendingTimeline({ currency, filters, periodOffset });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
          setResult(emptyTimeline());
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
  }, [core, currency, enabled, filters, onError, periodOffset, refreshSignal]);

  const points = useMemo(() => toPointViews(result), [result]);

  return (
    <SpendingTimelineCardView
      required={{
        data: {
          windowLabel: result.window.label,
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
