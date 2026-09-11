import { useEffect, useMemo, useState } from 'react';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AnalyticsFlowReport, AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentFlowReport, type FlowViewModel } from './flowPresenters';
import { ForecastView } from '../ui/Forecast/ForecastView';

export type ForecastComponentProps = { core: AnalyticsPort; currency: string; filters?: AnalyticsFiltersInput; refreshSignal: boolean; amountVisibility?: AmountVisibility; onError?: (error: { message: string }) => void };

export function ForecastComponent({ core, currency, filters, refreshSignal, amountVisibility, onError }: ForecastComponentProps) {
  const [shift, setShift] = useState(0);
  const [report, setReport] = useState<FlowViewModel>();
  const [loadedKey, setLoadedKey] = useState('');
  const filterKey = JSON.stringify({ currency, filters });
  const selection = useMemo(() => ({ period: normalizeAnalyticsPeriodInput(filters?.period), shift }), [filters?.period, shift]);
  const requestKey = `${filterKey}:${shift}:${refreshSignal}`;
  useEffect(() => {
    if (!currency || !core.analyticsGetFlowReport) return undefined;
    let active = true;
    void core.analyticsGetFlowReport({ currency, filters, periodSelection: selection }).then((result: AnalyticsFlowReport) => {
      if (active) { setReport(presentFlowReport(result)); setLoadedKey(requestKey); }
    }).catch((error: unknown) => {
      if (active) { setLoadedKey(requestKey); onError?.({ message: error instanceof Error ? error.message : 'Unable to load forecast' }); }
    });
    return () => { active = false; };
  }, [core, currency, filters, onError, refreshSignal, requestKey, selection]);
  return <ForecastView required={{ report, status: { loading: Boolean(currency && core.analyticsGetFlowReport) && loadedKey !== requestKey, error: !core.analyticsGetFlowReport ? 'Forecast is unavailable' : undefined, amountVisibility } }} provided={{ state: { canPrevious: report?.canGoPrevious ?? true, canNext: report?.canGoNext ?? shift < 0 }, commands: { previous: () => setShift((current) => current - 1), next: () => setShift((current) => Math.min(0, current + 1)) } }} />;
}
