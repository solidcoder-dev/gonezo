import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type { AnalyticsOverviewInsightsResult, AnalyticsPort } from './analytics.port';
import { OverviewSnapshotCardView } from '../ui/OverviewSnapshotCard/OverviewSnapshotCardView';
import { OverviewStartersView } from '../ui/OverviewStarters/OverviewStartersView';
import styles from '../ui/AnalyticsPageView.module.css';
import { presentOverviewSnapshot, presentOverviewStarters } from './OverviewTabPresentation';

type OverviewTabComponentProps = {
  required: {
    context: { core: AnalyticsPort };
    config: { enabled: boolean; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean };
  };
  provided?: { events?: { onError?: (error: { message: string }) => void } };
};

type SnapshotState = { result?: Awaited<ReturnType<AnalyticsPort['analyticsGetOverviewSnapshot']>>; loading: boolean; inputKey?: string };
type InsightsState = { result?: AnalyticsOverviewInsightsResult; loading: boolean; inputKey?: string };

export function OverviewTabComponent({ required, provided }: OverviewTabComponentProps) {
  const [snapshotState, setSnapshotState] = useState<SnapshotState>({ loading: true });
  const [insightsState, setInsightsState] = useState<InsightsState>({ loading: true });
  const requestId = useRef(0);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;
  const inputKey = JSON.stringify({ currency, filters, refreshSignal });

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    if (!enabled || !currency) {
      return undefined;
    }

    const input = { currency, filters };

    void core.analyticsGetOverviewSnapshot(input).then((result) => {
      if (requestId.current === currentRequestId) setSnapshotState({ result, loading: false, inputKey });
    }).catch((error: unknown) => {
      if (requestId.current === currentRequestId) {
        onError?.({ message: toErrorMessage(error) });
        setSnapshotState((current) => ({ ...current, loading: false, inputKey }));
      }
    });

    void core.analyticsGetOverviewInsights(input).then((result) => {
      if (requestId.current === currentRequestId) setInsightsState({ result, loading: false, inputKey });
    }).catch((error: unknown) => {
      if (requestId.current === currentRequestId) {
        onError?.({ message: toErrorMessage(error) });
        setInsightsState((current) => ({ ...current, loading: false, inputKey }));
      }
    });

    return () => {
      requestId.current += 1;
    };
  }, [core, currency, enabled, filters, inputKey, onError, refreshSignal]);

  const snapshot = snapshotState.result;
  const starterItems = useMemo(
    () => presentOverviewStarters(snapshot, insightsState.result, currency || 'USD'),
    [currency, insightsState.result, snapshot],
  );

  return (
    <div data-testid="overview-tab" className={styles.analyticsOverviewContent}>
      <OverviewSnapshotCardView
        required={{
          data: presentOverviewSnapshot(snapshot, currency || 'USD'),
          status: { loading: (snapshotState.loading || snapshotState.inputKey !== inputKey) && enabled && Boolean(currency) },
        }}
        provided={{ commands: {} }}
      />
      <OverviewStartersView
        required={{
          data: { previewItems: starterItems.slice(0, 6), allItems: starterItems },
          status: { loading: (insightsState.loading || insightsState.inputKey !== inputKey) && enabled && Boolean(currency) },
        }}
      />
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
