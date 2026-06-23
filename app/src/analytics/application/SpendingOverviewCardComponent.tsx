import { useEffect, useMemo, useState } from 'react';
import type { LedgerCashFlowGranularity } from '../../ledger/application/ledger.port';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsSpendingOverviewInput, AnalyticsSpendingOverviewResult } from './analytics.port';
import { SpendingOverviewCardView } from '../ui/SpendingOverviewCard/SpendingOverviewCardView';
import type { SpendingOverviewCategoryView } from '../ui/SpendingOverviewCard/SpendingOverviewCardView.contract';

export type SpendingOverviewCardPort = {
  analyticsGetSpendingOverview(input: AnalyticsSpendingOverviewInput): Promise<AnalyticsSpendingOverviewResult>;
};

export type SpendingOverviewCardComponentProps = {
  required: {
    context: {
      core: SpendingOverviewCardPort;
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

const COLORS = ['#f28b8b', '#86d69a', '#f7cf6d', '#8ab9ee', '#a78bfa', '#7dd3fc'];

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function emptyOverview(): AnalyticsSpendingOverviewResult {
  return {
    granularity: 'monthly',
    window: { label: '', periodOffset: 0, canGoNext: false },
    totalExpenseAmount: '0.00',
    categories: [],
  };
}

function toCategoryViews(
  result: AnalyticsSpendingOverviewResult,
  currency: string,
): SpendingOverviewCategoryView[] {
  return result.categories.map((category, index) => ({
    key: category.categoryId ?? category.categoryName,
    name: category.categoryName,
    amount: formatCurrencyAmount(category.amount, currency),
    percentage: category.percentage,
    color: COLORS[index % COLORS.length],
  }));
}

export function SpendingOverviewCardComponent({ required, provided }: SpendingOverviewCardComponentProps) {
  const [overview, setOverview] = useState<AnalyticsSpendingOverviewResult>(emptyOverview);
  const [granularity, setGranularity] = useState<LedgerCashFlowGranularity>('monthly');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, refreshSignal } = required.config;

  useEffect(() => {
    setPeriodOffset(0);
  }, [currency]);

  useEffect(() => {
    if (!enabled || !currency) {
      setOverview(emptyOverview());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      try {
        const result = await core.analyticsGetSpendingOverview({ currency, granularity, periodOffset });
        if (!cancelled) {
          setOverview(result);
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

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, granularity, periodOffset, refreshSignal]);

  const categories = useMemo(() => toCategoryViews(overview, currency || 'USD'), [currency, overview]);

  return (
    <SpendingOverviewCardView
      required={{
        data: {
          totalAmount: formatCurrencyAmount(overview.totalExpenseAmount, currency || 'USD'),
          windowLabel: overview.window.label,
          categories,
        },
        state: { granularity, canGoNextWindow: overview.window.canGoNext },
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
