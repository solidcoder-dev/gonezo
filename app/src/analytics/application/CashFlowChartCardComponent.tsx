import { useEffect, useMemo, useState } from 'react';
import type {
  LedgerCashFlowGranularity,
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import { CashFlowChartCardView } from '../ui/CashFlowChartCard/CashFlowChartCardView';

export type CashFlowChartCardPort = {
  ledgerGetCashFlowSeries(input: LedgerGetCashFlowSeriesInput): Promise<LedgerGetCashFlowSeriesResult>;
};

export type CashFlowChartCardComponentProps = {
  required: {
    context: {
      core: CashFlowChartCardPort;
    };
    config: {
      enabled: boolean;
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
  const [requestedCurrency, setRequestedCurrency] = useState('');
  const [granularity, setGranularity] = useState<LedgerCashFlowGranularity>('monthly');
  const [result, setResult] = useState<LedgerGetCashFlowSeriesResult>({
    currencies: [],
    selectedCurrency: '',
    granularity: 'monthly',
    totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
    window: { label: '', periodOffset: 0, canGoNext: false },
    points: [],
  });
  const [loading, setLoading] = useState(true);
  const [periodOffset, setPeriodOffset] = useState(0);

  useEffect(() => {
    if (!required.config.enabled) {
      setLoading(false);
      setResult({
        currencies: [],
        selectedCurrency: '',
        granularity,
        totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
        window: { label: '', periodOffset, canGoNext: false },
        points: [],
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const nextResult = await core.ledgerGetCashFlowSeries({
          currency: requestedCurrency || undefined,
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
  }, [core, granularity, periodOffset, requestedCurrency, required.config.enabled, required.config.refreshSignal]);

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
          currencies: result.currencies,
          selectedCurrency: result.selectedCurrency,
          windowLabel: result.window.label,
          points: chartPoints,
        },
        state: { granularity, canGoNextWindow: result.window.canGoNext },
        status: { loading },
      }}
      provided={{
        commands: {
          selectCurrency: (currency) => {
            setRequestedCurrency(currency);
            setPeriodOffset(0);
          },
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
