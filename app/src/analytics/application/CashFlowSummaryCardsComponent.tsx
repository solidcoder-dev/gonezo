import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsCashFlowSummaryResult } from './analytics.port';
import { CashFlowSummaryCardsView } from '../ui/CashFlowSummaryCards/CashFlowSummaryCardsView';
import type { CashFlowSummaryCardView } from '../ui/CashFlowSummaryCards/CashFlowSummaryCardsView.contract';

export type CashFlowSummaryCardsPort = {
  analyticsGetPeriodCashFlowSummary(input: { currency: string }): Promise<AnalyticsCashFlowSummaryResult>;
};

export type CashFlowSummaryCardsComponentProps = {
  required: {
    context: {
      core: CashFlowSummaryCardsPort;
    };
    config: {
      enabled: boolean;
      currency: string;
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
  return error instanceof Error ? error.message : 'Unknown error';
}

function emptySummary(): AnalyticsCashFlowSummaryResult {
  return { incomeAmount: '0.00', expenseAmount: '0.00', netFlowAmount: '0.00' };
}

function toCards(summary: AnalyticsCashFlowSummaryResult, currency: string): CashFlowSummaryCardView[] {
  return [
    {
      key: 'income',
      label: 'Income',
      amount: formatCurrencyAmount(summary.incomeAmount, currency),
      iconClassName: 'bi bi-graph-up-arrow',
      tone: 'income',
    },
    {
      key: 'expense',
      label: 'Expenses',
      amount: formatCurrencyAmount(summary.expenseAmount, currency),
      iconClassName: 'bi bi-graph-down-arrow',
      tone: 'expense',
    },
    {
      key: 'netFlow',
      label: 'Net flow',
      amount: formatCurrencyAmount(summary.netFlowAmount, currency),
      iconClassName: 'bi bi-activity',
      tone: 'net',
    },
  ];
}

export function CashFlowSummaryCardsComponent({ required, provided }: CashFlowSummaryCardsComponentProps) {
  const [summary, setSummary] = useState<AnalyticsCashFlowSummaryResult>(emptySummary);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, refreshSignal } = required.config;

  useEffect(() => {
    if (!enabled || !currency) {
      setSummary(emptySummary());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      try {
        const result = await core.analyticsGetPeriodCashFlowSummary({ currency });
        if (!cancelled) {
          setSummary(result);
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

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, refreshSignal]);

  const cards = useMemo(() => toCards(summary, currency || 'USD'), [currency, summary]);

  return (
    <CashFlowSummaryCardsView
      required={{
        data: { cards },
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
