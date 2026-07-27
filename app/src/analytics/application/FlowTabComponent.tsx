import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsPort, AnalyticsFlowReport } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentFlowReport, type FlowViewModel } from './flowPresenters';
import { FlowTabView } from '../ui/FlowTab/FlowTabView';
import styles from '../ui/AnalyticsPageView.module.css';

export type FlowTabComponentProps = { required: { context: { core: AnalyticsPort }; config: { enabled: boolean; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean } }; provided?: { events?: { onError?: (error: { message: string }) => void } } };
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Unable to load flow'; }
function emptySelection(filters?: AnalyticsFiltersInput) { return { period: normalizeAnalyticsPeriodInput(filters?.period), shift: 0 }; }

export function FlowTabComponent({ required, provided }: FlowTabComponentProps) {
  const { core } = required.context; const { enabled, currency, filters, refreshSignal } = required.config;
  const filterKey = JSON.stringify({ currency, filters }); const [shift, setShift] = useState(0); const [selectionKey, setSelectionKey] = useState(filterKey); const [report, setReport] = useState<FlowViewModel>(); const [loadedKey, setLoadedKey] = useState(''); const [error, setError] = useState<{ key: string; message: string }>();
  const effectiveShift = selectionKey === filterKey ? shift : 0;
  const selection = useMemo(() => ({ ...emptySelection(filters), shift: effectiveShift }), [filters, effectiveShift]); const requestKey = `${filterKey}:${effectiveShift}:${refreshSignal}`;
  useEffect(() => { if (!enabled || !currency) return undefined; let stale = false; const getReport = core.analyticsGetFlowReport; if (!getReport) return undefined; void getReport({ currency, filters, periodSelection: selection }).then((next: AnalyticsFlowReport) => { if (!stale) { setReport(presentFlowReport(next)); setError(undefined); setLoadedKey(requestKey); } }).catch((reason: unknown) => { if (!stale) { const message = errorMessage(reason); setError({ key: requestKey, message }); provided?.events?.onError?.({ message }); setLoadedKey(requestKey); } }); return () => { stale = true; }; }, [core, currency, enabled, filters, provided?.events, refreshSignal, requestKey, selection]);
  return <div className={styles.stack}><FlowTabView required={{ report: enabled && currency ? report : undefined, status: { loading: enabled && Boolean(currency) && Boolean(core.analyticsGetFlowReport) && loadedKey !== requestKey, error: !core.analyticsGetFlowReport ? 'Flow report is unavailable' : error?.key === requestKey ? error.message : undefined } }} provided={{ state: { canPrevious: report?.canGoPrevious ?? true, canNext: report?.canGoNext ?? effectiveShift < 0 }, commands: { previous: () => { setSelectionKey(filterKey); setShift(() => effectiveShift - 1); }, next: () => { setSelectionKey(filterKey); setShift(() => Math.min(0, effectiveShift + 1)); } } }} /></div>;
}
