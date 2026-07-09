import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount, formatIsoDate } from '../../shared/utils/formatting';
import type {
  AnalyticsOverviewHighlight,
  AnalyticsOverviewSnapshotInput,
  AnalyticsOverviewSnapshotResult,
} from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { OverviewSnapshotCardView } from '../ui/OverviewSnapshotCard/OverviewSnapshotCardView';
import type { OverviewSnapshotHighlightView } from '../ui/OverviewSnapshotCard/OverviewSnapshotCardView.contract';

export type OverviewSnapshotCardPort = {
  analyticsGetOverviewSnapshot(input: AnalyticsOverviewSnapshotInput): Promise<AnalyticsOverviewSnapshotResult>;
};

export type OverviewSnapshotCardComponentProps = {
  required: {
    context: {
      core: OverviewSnapshotCardPort;
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

function emptyOverviewSnapshot(): AnalyticsOverviewSnapshotResult {
  return {
    currentWindow: { label: '', startDate: '', endDate: '' },
    currentTotals: { incomeAmount: '0.00', expenseAmount: '0.00', netFlowAmount: '0.00' },
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function signedCurrencyAmount(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return formatCurrencyAmount(amount, currency);
  }
  const formatted = formatCurrencyAmount(Math.abs(numeric).toFixed(2), currency);
  if (numeric > 0) {
    return `+${formatted}`;
  }
  if (numeric < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

function highlightAmount(highlight: AnalyticsOverviewHighlight, currency: string, tone: 'income' | 'expense'): string {
  const formatted = formatCurrencyAmount(highlight.amount, currency);
  return tone === 'income' ? `+${formatted}` : `-${formatted}`;
}

function toShare(amount: string, maxAmount: number): number {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || maxAmount <= 0) {
    return 0;
  }
  return (numeric / maxAmount) * 100;
}

function toHighlightViews(
  snapshot: AnalyticsOverviewSnapshotResult,
  currency: string,
): OverviewSnapshotHighlightView[] {
  const highlights: OverviewSnapshotHighlightView[] = [];
  if (snapshot.biggestExpense) {
    highlights.push({
      key: 'expense',
      label: 'Biggest expense',
      title: snapshot.biggestExpense.title,
      subtitle: snapshot.biggestExpense.subtitle,
      amount: highlightAmount(snapshot.biggestExpense, currency, 'expense'),
      occurredOn: formatIsoDate(snapshot.biggestExpense.occurredAt),
      iconClassName: 'bi bi-bag',
      tone: 'expense',
    });
  }
  if (snapshot.biggestIncome) {
    highlights.push({
      key: 'income',
      label: 'Biggest income',
      title: snapshot.biggestIncome.title,
      subtitle: snapshot.biggestIncome.subtitle,
      amount: highlightAmount(snapshot.biggestIncome, currency, 'income'),
      occurredOn: formatIsoDate(snapshot.biggestIncome.occurredAt),
      iconClassName: 'bi bi-briefcase',
      tone: 'income',
    });
  }
  return highlights;
}

export function OverviewSnapshotCardComponent({ required, provided }: OverviewSnapshotCardComponentProps) {
  const [snapshot, setSnapshot] = useState<AnalyticsOverviewSnapshotResult>(emptyOverviewSnapshot);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;

  useEffect(() => {
    if (!enabled || !currency) {
      setSnapshot(emptyOverviewSnapshot());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOverviewSnapshot() {
      setLoading(true);
      try {
        const result = await core.analyticsGetOverviewSnapshot({ currency, filters });
        if (!cancelled) {
          setSnapshot(result);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverviewSnapshot();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, filters, onError, refreshSignal]);

  const summary = useMemo(() => {
    const maxAmount = Math.max(Number(snapshot.currentTotals.incomeAmount) || 0, Number(snapshot.currentTotals.expenseAmount) || 0);
    return {
      comparison: snapshot.netFlowChangePercent ? `${Number(snapshot.netFlowChangePercent) > 0 ? '+' : ''}${snapshot.netFlowChangePercent}%` : undefined,
      incomeAmount: formatCurrencyAmount(snapshot.currentTotals.incomeAmount, currency || 'USD'),
      expenseAmount: formatCurrencyAmount(snapshot.currentTotals.expenseAmount, currency || 'USD'),
      netFlowAmount: signedCurrencyAmount(snapshot.currentTotals.netFlowAmount, currency || 'USD'),
      incomeShare: toShare(snapshot.currentTotals.incomeAmount, maxAmount),
      expenseShare: toShare(snapshot.currentTotals.expenseAmount, maxAmount),
      highlights: toHighlightViews(snapshot, currency || 'USD'),
    };
  }, [currency, snapshot]);

  return (
    <OverviewSnapshotCardView
      required={{
        data: {
          currentWindowLabel: snapshot.currentWindow.label,
          previousWindowLabel: snapshot.previousWindow?.label,
          comparisonPercent: summary.comparison,
          incomeAmount: summary.incomeAmount,
          expenseAmount: summary.expenseAmount,
          netFlowAmount: summary.netFlowAmount,
          incomeShare: summary.incomeShare,
          expenseShare: summary.expenseShare,
          highlights: summary.highlights,
        },
        status: { loading },
      }}
      provided={{ commands: {} }}
    />
  );
}
