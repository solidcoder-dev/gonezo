import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentSpendingSummary, presentTopExpenses } from './spendingPresenters';
import { SpendingTabView } from '../ui/SpendingTab/SpendingTabView';
import styles from '../ui/AnalyticsPageView.module.css';

export type SpendingTabComponentProps = {
  required: {
    context: { core: AnalyticsPort };
    config: { enabled: boolean; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean };
  };
  provided?: { events?: { onError?: (error: { message: string }) => void } };
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load spending';
}

function topExpensesSearchHref(report?: ReturnType<typeof presentSpendingSummary>): string | undefined {
  if (!report) return undefined;
  const endDate = new Date(`${report.window.endExclusive}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const params = new URLSearchParams({
    source: 'posted',
    type: 'expense',
    fromDate: report.window.start,
    toDate: endDate.toISOString().slice(0, 10),
  });
  return `/movements/search?${params.toString()}`;
}

export function SpendingTabComponent({ required, provided }: SpendingTabComponentProps) {
  const { core } = required.context;
  const { enabled, currency, filters, refreshSignal } = required.config;
  const [shift, setShift] = useState(0);
  const [report, setReport] = useState<ReturnType<typeof presentSpendingSummary>>();
  const [topExpenses, setTopExpenses] = useState<ReturnType<typeof presentTopExpenses>>();
  const [reportLoadedKey, setReportLoadedKey] = useState<string>();
  const [topLoadedKey, setTopLoadedKey] = useState<string>();
  const [reportError, setReportError] = useState<string>();
  const [topError, setTopError] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState<'categories' | null>(null);
  const period = normalizeAnalyticsPeriodInput(filters?.period);
  const filterKey = JSON.stringify({ currency, filters });
  const [selectionKey, setSelectionKey] = useState(filterKey);
  const effectiveShift = selectionKey === filterKey ? shift : 0;
  const selection = useMemo(() => ({ period, shift: effectiveShift }), [period, effectiveShift]);
  const reportUnavailable = enabled && Boolean(currency) && !core.analyticsGetSpendingReport;
  const topUnavailable = enabled && Boolean(currency) && !core.analyticsGetAnalyticsTopExpenses;
  const requestKey = `${filterKey}:${effectiveShift}:${refreshSignal}`;

  useEffect(() => {
    if (!enabled || !currency || reportUnavailable) return undefined;
    let stale = false;
    const getReport = core.analyticsGetSpendingReport;
    if (!getReport) return undefined;
    void getReport({ currency, filters, periodSelection: selection }).then((result) => {
      if (!stale) { setReport(presentSpendingSummary(result)); setReportError(undefined); setReportLoadedKey(requestKey); }
    }).catch((error: unknown) => {
      if (!stale) { setReportError(message(error)); provided?.events?.onError?.({ message: message(error) }); }
    });
    return () => { stale = true; };
  }, [core, currency, enabled, filters, refreshSignal, reportUnavailable, requestKey, selection, provided?.events]);

  useEffect(() => {
    if (!enabled || !currency || topUnavailable) return undefined;
    let stale = false;
    const getTopExpenses = core.analyticsGetAnalyticsTopExpenses;
    if (!getTopExpenses) return undefined;
    void getTopExpenses({ currency, filters, periodSelection: selection }).then((result) => {
      if (!stale) { setTopExpenses(presentTopExpenses(result)); setTopError(undefined); setTopLoadedKey(requestKey); }
    }).catch((error: unknown) => {
      if (!stale) { setTopError(message(error)); provided?.events?.onError?.({ message: message(error) }); }
    });
    return () => { stale = true; };
  }, [core, currency, enabled, filters, refreshSignal, requestKey, topUnavailable, selection, provided?.events]);

  return <div className={styles.stack}>
    <SpendingTabView
      required={{ report: enabled && currency ? report : undefined, topExpenses: enabled && currency ? topExpenses : undefined, topExpensesSearchHref: enabled && currency ? topExpensesSearchHref(report) : undefined, status: { reportLoading: enabled && Boolean(currency) && reportLoadedKey !== requestKey, topLoading: enabled && Boolean(currency) && topLoadedKey !== requestKey, reportError: reportError || (reportUnavailable ? 'Spending report is unavailable' : undefined), topError: topError || (topUnavailable ? 'Top expenses is unavailable' : undefined) } }}
      provided={{
        state: { canPrevious: report?.window.canGoPrevious ?? true, canNext: report?.window.canGoNext ?? effectiveShift < 0, sheetOpen },
        commands: { previous: () => { setSelectionKey(filterKey); setShift((current) => current - 1); }, next: () => { setSelectionKey(filterKey); setShift((current) => Math.min(0, current + 1)); }, openCategories: () => setSheetOpen('categories'), closeSheet: () => setSheetOpen(null) },
      }}
    />
  </div>;
}
