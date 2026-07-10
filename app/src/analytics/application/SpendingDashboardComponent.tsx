import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyAmount } from '../../shared/utils/formatting';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import type {
  AnalyticsSpendingDashboardInput,
  AnalyticsSpendingDashboardResult,
} from './analytics.port';
import { SpendingDashboardView } from '../ui/SpendingDashboard/SpendingDashboardView';
import { presentSpendingCategoryBreakdown, type SpendingCategoryBreakdownItem } from './spendingCategoryBreakdownPresentation';

export type SpendingDashboardPort = {
  analyticsGetSpendingDashboard(input: AnalyticsSpendingDashboardInput): Promise<AnalyticsSpendingDashboardResult>;
};

export type SpendingDashboardComponentProps = {
  required: {
    context: {
      core: SpendingDashboardPort;
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

function emptyDashboard(): AnalyticsSpendingDashboardResult {
  return {
    currentWindow: {
      label: '',
      startDate: '',
      endDate: '',
    },
    totalExpenseAmount: '0.00',
    categories: [],
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toCategoryItems(result: AnalyticsSpendingDashboardResult): SpendingCategoryBreakdownItem[] {
  return result.categories.map((category) => ({
    key: category.categoryId ?? category.categoryName,
    name: category.categoryName,
    amountValue: category.amount,
    percentage: category.percentage,
  }));
}

export function SpendingDashboardComponent({ required, provided }: SpendingDashboardComponentProps) {
  const [result, setResult] = useState<AnalyticsSpendingDashboardResult>(emptyDashboard);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { core } = required.context;
  const { currency, enabled, filters, refreshSignal } = required.config;
  const onError = provided?.events?.onError;

  useEffect(() => {
    if (!enabled || !currency) {
      setResult(emptyDashboard());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const nextResult = await core.analyticsGetSpendingDashboard({ currency, filters });
        if (!cancelled) {
          setResult(nextResult);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.({ message: toErrorMessage(error) });
          setResult(emptyDashboard());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [core, currency, enabled, filters, onError, refreshSignal]);

  const categories = useMemo(() => toCategoryItems(result), [result]);
  const categoryBreakdown = useMemo(
    () => presentSpendingCategoryBreakdown(categories, currency || 'USD'),
    [categories, currency],
  );
  const comparisonAmount = result.previousExpenseChangePercent
    ? `${Number(result.previousExpenseChangePercent) > 0 ? '+' : ''}${result.previousExpenseChangePercent}%`
    : undefined;

  return (
    <SpendingDashboardView
      required={{
        data: {
          totalAmount: formatCurrencyAmount(result.totalExpenseAmount, currency || 'USD'),
          comparisonAmount,
          currentWindowLabel: result.currentWindow.label,
          previousWindowLabel: result.previousWindow?.label,
          visibleCategories: categoryBreakdown.visibleCategories,
          allCategories: categoryBreakdown.allCategories,
        },
        state: { breakdownOpen },
        status: { loading },
      }}
      provided={{
        commands: {
          openBreakdown: () => setBreakdownOpen(true),
          closeBreakdown: () => setBreakdownOpen(false),
        },
      }}
    />
  );
}
