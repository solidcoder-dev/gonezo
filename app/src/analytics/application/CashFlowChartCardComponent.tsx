import { useEffect, useMemo, useState } from 'react';
import type {
  LedgerCashFlowGranularity,
  LedgerGetCashFlowSeriesInput,
  LedgerGetCashFlowSeriesResult,
} from '../../ledger/application/ledger.port';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
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
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [granularity, setGranularity] = useState<LedgerCashFlowGranularity>('monthly');
  const [result, setResult] = useState<LedgerGetCashFlowSeriesResult>({
    currencies: [],
    selectedCurrency: '',
    granularity: 'monthly',
    totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
    points: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!required.config.enabled) {
      setLoading(false);
      setResult({
        currencies: [],
        selectedCurrency: '',
        granularity,
        totals: { incomeAmount: '0.00', expenseAmount: '0.00' },
        points: [],
      });
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const nextResult = await core.ledgerGetCashFlowSeries({
          currency: selectedCurrency || undefined,
          granularity,
        });
        if (!cancelled) {
          setResult(nextResult);
          if (nextResult.selectedCurrency && nextResult.selectedCurrency !== selectedCurrency) {
            setSelectedCurrency(nextResult.selectedCurrency);
          }
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
  }, [core, granularity, required.config.enabled, required.config.refreshSignal, selectedCurrency]);

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
          incomeTotalLabel: result.selectedCurrency
            ? formatCurrencyAmount(result.totals.incomeAmount, result.selectedCurrency)
            : result.totals.incomeAmount,
          expenseTotalLabel: result.selectedCurrency
            ? formatCurrencyAmount(result.totals.expenseAmount, result.selectedCurrency)
            : result.totals.expenseAmount,
          points: chartPoints,
        },
        state: { granularity },
        status: { loading },
      }}
      provided={{
        commands: {
          selectCurrency: setSelectedCurrency,
          selectGranularity: setGranularity,
        },
      }}
    />
  );
}
