import { useEffect, useMemo, useState } from 'react';
import type {
  LedgerCashFlowGranularity,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import type { AnalyticsCashFlowSeriesInput } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { CashFlowChartCardView } from '../ui/CashFlowChartCard/CashFlowChartCardView';

export type CashFlowChartCardPort = {
  analyticsGetCashFlowSeries(input: AnalyticsCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
};

export type CashFlowChartCardComponentProps = {
  required: {
    context: {
      core: CashFlowChartCardPort;
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
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function CashFlowChartCardComponent({ required, provided }: CashFlowChartCardComponentProps) {
  const { core } = required.context;
  const [granularity, setGranularity] = useState<LedgerCashFlowGranularity>('monthly');
  const [result, setResult] = useState<LedgerGetCashFlowSeriesResult>({
    currencies: [],
    selectedCurrency: '',
    granularity: 'monthly',
    totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
    window: { label: '', periodOffset: 0, canGoPrevious: false, canGoNext: false },
    points: [],
  });
  const [loading, setLoading] = useState(true);
  const [periodOffset, setPeriodOffset] = useState(0);

  useEffect(() => {
    setPeriodOffset(0);
  }, [required.config.currency, required.config.filters]);

  useEffect(() => {
    if (!required.config.enabled || !required.config.currency) {
      setLoading(false);
      setResult({
        currencies: [],
        selectedCurrency: '',
        granularity,
        totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
        window: { label: '', periodOffset, canGoPrevious: false, canGoNext: false },
        points: [],
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetCashFlowSeries({
          currency: required.config.currency,
          filters: required.config.filters,
          granularity,
          periodOffset,
        });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (err) {
        if (!cancelled) {
          provided?.events?.onError?.({ message: toErrorMessage(err) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [core, granularity, periodOffset, required.config.currency, required.config.enabled, required.config.filters, required.config.refreshSignal]);

  const chartPoints = useMemo(
    () => result.points.map((point) => ({
      key: point.periodKey,
      label: point.label,
      values: [
        { key: 'expense' as const, value: Number(point.expenseAmount) || 0 },
        { key: 'income' as const, value: Number(point.incomeAmount) || 0 },
      ],
    })),
    [result.points],
  );

  return (
    <CashFlowChartCardView
      required={{
        data: {
          selectedCurrency: result.selectedCurrency,
          windowLabel: result.window.label,
          points: chartPoints,
        },
        state: {
          granularity,
          canGoPreviousWindow: result.window.canGoPrevious,
          canGoNextWindow: result.window.canGoNext,
        },
        status: { loading },
      }}
      provided={{
        commands: {
          selectGranularity: (nextGranularity) => {
            setGranularity(nextGranularity);
            setPeriodOffset(0);
          },
          goToPreviousWindow: () => setPeriodOffset((current) => current - 1),
          goToNextWindow: () => setPeriodOffset((current) => Math.min(0, current + 1)),
        },
      }}
    />
  );
}
