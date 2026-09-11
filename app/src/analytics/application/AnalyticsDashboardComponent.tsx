import { useEffect, useMemo, useState } from 'react';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AnalyticsOverviewInsightsResult, AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentOverviewSnapshot, presentAnalyticsHighlights } from './OverviewTabPresentation';
import { presentSpendingSummary, type SpendingReportViewModel } from './spendingPresenters';
import { presentFlowReport, type FlowViewModel } from './flowPresenters';
import { AnalyticsSummaryView, CategoryBreakdownView, ForecastSummaryView, HighlightsView, SpendingTimelineView, TopMerchantsView } from '../ui/AnalyticsDashboard/AnalyticsDashboardViews';
import type { OverviewStarterItemView } from '../ui/AnalyticsHighlights/AnalyticsHighlightsView.contract';
import styles from '../ui/AnalyticsPageView.module.css';

export type AnalyticsDashboardComponentProps = {
  required: { context: { core: AnalyticsPort }; config: { enabled: boolean; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean; amountVisibility?: AmountVisibility } };
  provided?: { events?: { onError?: (error: { message: string }) => void; onCategorySelected?: (categoryId: string) => void; onMerchantSelected?: (merchant: string) => void; onHighlightSelected?: (item: OverviewStarterItemView) => void; onForecastSelected?: () => void } };
};

type DashboardState = { snapshot?: Awaited<ReturnType<AnalyticsPort['analyticsGetOverviewSnapshot']>>; insights?: AnalyticsOverviewInsightsResult; spending?: SpendingReportViewModel; flow?: FlowViewModel; loading: boolean };

export function AnalyticsDashboardComponent({ required, provided }: AnalyticsDashboardComponentProps) {
  const { core } = required.context;
  const { config } = required;
  const [state, setState] = useState<DashboardState>({ loading: true });
  const filters = config.filters;
  const periodSelection = useMemo(() => ({ period: normalizeAnalyticsPeriodInput(filters?.period), shift: 0 }), [filters?.period]);
  const inputKey = JSON.stringify({ currency: config.currency, filters, refreshSignal: config.refreshSignal });

  useEffect(() => {
    if (!config.enabled || !config.currency) return undefined;
    let active = true;
    const input = { currency: config.currency, filters };
    const requests: [
      ReturnType<AnalyticsPort['analyticsGetOverviewSnapshot']>,
      ReturnType<AnalyticsPort['analyticsGetOverviewInsights']>,
      Promise<Awaited<ReturnType<NonNullable<AnalyticsPort['analyticsGetSpendingReport']>>> | undefined>,
      Promise<Awaited<ReturnType<NonNullable<AnalyticsPort['analyticsGetFlowReport']>>> | undefined>,
    ] = [
      core.analyticsGetOverviewSnapshot(input),
      core.analyticsGetOverviewInsights(input),
      core.analyticsGetSpendingReport ? core.analyticsGetSpendingReport({ ...input, periodSelection }) : Promise.resolve(undefined),
      core.analyticsGetFlowReport ? core.analyticsGetFlowReport({ ...input, periodSelection }) : Promise.resolve(undefined),
    ];
    void Promise.all(requests).then(([snapshot, insights, spending, flow]) => {
      if (!active) return;
      setState({ snapshot, insights, spending: spending ? presentSpendingSummary(spending) : undefined, flow: flow ? presentFlowReport(flow) : undefined, loading: false });
    }).catch((error: unknown) => {
      if (!active) return;
      provided?.events?.onError?.({ message: error instanceof Error ? error.message : 'Unable to load analytics' });
      setState((current) => ({ ...current, loading: false }));
    });
    return () => { active = false; };
  }, [core, config.currency, config.enabled, config.refreshSignal, filters, inputKey, periodSelection, provided?.events]);

  const summary = presentOverviewSnapshot(state.snapshot, config.currency || 'USD');
  const highlights = useMemo(() => presentAnalyticsHighlights(state.snapshot, state.insights, config.currency || 'USD'), [config.currency, state.insights, state.snapshot]);
  return <div className={`${styles.analyticsOverviewContent} ${styles.dashboard}`} data-testid="analytics-dashboard">
    <AnalyticsSummaryView data={summary} loading={state.loading} visibility={config.amountVisibility} />
    <SpendingTimelineView report={state.spending} loading={state.loading} />
    <CategoryBreakdownView report={state.spending} loading={state.loading} visibility={config.amountVisibility} onSelect={(categoryId) => provided?.events?.onCategorySelected?.(categoryId)} />
    <HighlightsView items={highlights} loading={state.loading} visibility={config.amountVisibility} onSelect={(item) => provided?.events?.onHighlightSelected?.(item)} />
    <TopMerchantsView report={state.spending} loading={state.loading} visibility={config.amountVisibility} onSelect={(merchant) => provided?.events?.onMerchantSelected?.(merchant)} />
    <ForecastSummaryView report={state.flow} loading={state.loading} visibility={config.amountVisibility} onOpen={() => provided?.events?.onForecastSelected?.()} />
  </div>;
}
