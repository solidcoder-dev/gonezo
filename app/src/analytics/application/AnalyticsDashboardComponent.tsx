import { useEffect, useMemo, useState } from 'react';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AnalyticsOverviewInsightsResult, AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentOverviewSnapshot, presentAnalyticsHighlights } from './OverviewTabPresentation';
import { presentSpendingSummary, type SpendingReportViewModel } from './spendingPresenters';
import { presentFlowReport, type FlowViewModel } from './flowPresenters';
import { AnalyticsSummaryView, CategoryBreakdownView, ForecastSummaryView, HighlightsView, SpendingTimelineView, TopMerchantsView } from '../ui/AnalyticsDashboard/AnalyticsDashboardViews';
import type { AnalyticsHighlightViewModel } from '../ui/AnalyticsHighlights/AnalyticsHighlightsView.contract';
import styles from '../ui/AnalyticsPageView.module.css';

export type AnalyticsDashboardComponentProps = {
  required: { context: { core: AnalyticsPort }; config: { enabled: boolean; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean; amountVisibility?: AmountVisibility } };
  provided?: { events?: { onError?: (error: { message: string }) => void; onCategorySelected?: (categoryId: string) => void; onMerchantSelected?: (merchant: string) => void; onHighlightSelected?: (item: AnalyticsHighlightViewModel) => void; onForecastSelected?: () => void; onIncomeSelected?: (window: { start: string; end: string }) => void; onExpensesSelected?: (window: { start: string; end: string }) => void; onSpendingPeriodSelected?: (bucket: { start: string; endExclusive: string }) => void } };
};

type DashboardState = {
  snapshot?: Awaited<ReturnType<AnalyticsPort['analyticsGetOverviewSnapshot']>>;
  insights?: AnalyticsOverviewInsightsResult;
  spending?: SpendingReportViewModel;
  flow?: FlowViewModel;
  summaryLoading: boolean;
  insightsLoading: boolean;
  spendingLoading: boolean;
  forecastLoading: boolean;
};

export function AnalyticsDashboardComponent({ required, provided }: AnalyticsDashboardComponentProps) {
  const { core } = required.context;
  const { config } = required;
  const [state, setState] = useState<DashboardState>({ summaryLoading: true, insightsLoading: true, spendingLoading: true, forecastLoading: true });
  const filters = config.filters;
  const periodSelection = useMemo(() => ({ period: normalizeAnalyticsPeriodInput(filters?.period), shift: 0 }), [filters?.period]);
  const inputKey = JSON.stringify({ currency: config.currency, filters, refreshSignal: config.refreshSignal });

  useEffect(() => {
    if (!config.enabled || !config.currency) return undefined;
    let active = true;
    const input = { currency: config.currency, filters };
    void Promise.resolve().then(() => {
      if (active) setState({ summaryLoading: true, insightsLoading: true, spendingLoading: true, forecastLoading: true });
    });
    const load = <T,>(request: () => Promise<T>, onSuccess: (value: T) => void, onSettled: () => void) => {
      void Promise.resolve().then(request).then((value) => {
        if (active) onSuccess(value);
      }).catch((error: unknown) => {
        if (active) provided?.events?.onError?.({ message: error instanceof Error ? error.message : 'Unable to load analytics' });
      }).finally(() => {
        if (active) onSettled();
      });
    };
    load(
      () => core.analyticsGetOverviewSnapshot(input),
      (snapshot) => setState((current) => ({ ...current, snapshot })),
      () => setState((current) => ({ ...current, summaryLoading: false })),
    );
    load(
      () => core.analyticsGetOverviewInsights(input),
      (insights) => setState((current) => ({ ...current, insights })),
      () => setState((current) => ({ ...current, insightsLoading: false })),
    );
    load(
      () => core.analyticsGetSpendingReport ? core.analyticsGetSpendingReport({ ...input, periodSelection }) : Promise.resolve(undefined),
      (spending) => setState((current) => ({ ...current, spending: spending ? presentSpendingSummary(spending) : undefined })),
      () => setState((current) => ({ ...current, spendingLoading: false })),
    );
    load(
      () => core.analyticsGetFlowReport ? core.analyticsGetFlowReport({ ...input, periodSelection }) : Promise.resolve(undefined),
      (flow) => setState((current) => ({ ...current, flow: flow ? presentFlowReport(flow) : undefined })),
      () => setState((current) => ({ ...current, forecastLoading: false })),
    );
    return () => { active = false; };
  }, [core, config.currency, config.enabled, config.refreshSignal, filters, inputKey, periodSelection, provided?.events]);

  const summary = presentOverviewSnapshot(state.snapshot, config.currency || 'USD');
  const highlights = useMemo(() => presentAnalyticsHighlights(state.snapshot, state.insights, config.currency || 'USD'), [config.currency, state.insights, state.snapshot]);
  return <div className={`${styles.analyticsOverviewContent} ${styles.dashboard}`} data-testid="analytics-dashboard">
    <AnalyticsSummaryView data={summary} loading={state.summaryLoading} visibility={config.amountVisibility} onIncomeSelected={() => provided?.events?.onIncomeSelected?.({ start: state.snapshot?.currentWindow.startDate ?? '', end: state.snapshot?.currentWindow.endDate ?? '' })} onExpensesSelected={() => provided?.events?.onExpensesSelected?.({ start: state.snapshot?.currentWindow.startDate ?? '', end: state.snapshot?.currentWindow.endDate ?? '' })} />
    <SpendingTimelineView report={state.spending} loading={state.spendingLoading} onSelect={(bucket) => provided?.events?.onSpendingPeriodSelected?.(bucket)} />
    <CategoryBreakdownView report={state.spending} loading={state.spendingLoading} visibility={config.amountVisibility} onSelect={(categoryId) => provided?.events?.onCategorySelected?.(categoryId)} />
    <HighlightsView items={highlights} loading={state.insightsLoading || state.summaryLoading} visibility={config.amountVisibility} onSelect={(item) => provided?.events?.onHighlightSelected?.(item)} />
    <TopMerchantsView report={state.spending} loading={state.spendingLoading} visibility={config.amountVisibility} onSelect={(merchant) => provided?.events?.onMerchantSelected?.(merchant)} />
    <ForecastSummaryView report={state.flow} loading={state.forecastLoading} visibility={config.amountVisibility} onOpen={() => provided?.events?.onForecastSelected?.()} />
  </div>;
}
