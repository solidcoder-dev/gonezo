import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import { FinancialAmountView } from '../../shared/ui/FinancialAmount/FinancialAmountView';
import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentSpendingSummary } from './spendingPresenters';

export function AnalyticsCategoryDetailComponent({ core, categoryId, currency, filters, refreshSignal, amountVisibility, onError }: {
  core: AnalyticsPort;
  categoryId: string;
  currency: string;
  filters?: AnalyticsFiltersInput;
  refreshSignal: boolean;
  amountVisibility?: AmountVisibility;
  onError?: (error: { message: string }) => void;
}) {
  const [report, setReport] = useState<ReturnType<typeof presentSpendingSummary>>();
  useEffect(() => {
    if (!currency || !core.analyticsGetSpendingReport) return undefined;
    let active = true;
    void core.analyticsGetSpendingReport({ currency, filters, periodSelection: { period: normalizeAnalyticsPeriodInput(filters?.period), shift: 0 } })
      .then((result) => { if (active) setReport(presentSpendingSummary(result)); })
      .catch((error: unknown) => { if (active) onError?.({ message: error instanceof Error ? error.message : 'Unable to load category' }); });
    return () => { active = false; };
  }, [core, categoryId, currency, filters, onError, refreshSignal]);

  const category = report?.allCategories.find((item) => item.key === categoryId);
  const visibility = amountVisibility ?? 'visible';
  return (
    <main className="d-grid gap-4" aria-label="Category detail">
      <div><h2 className="m-0">{category?.name ?? 'Category'}</h2><p className="text-secondary mb-0">Category spending</p></div>
      <section aria-label="Category summary" className="d-grid gap-2">
        <FinancialAmountView formattedAmount={category?.amount ?? '0.00'} visibility={visibility} className="fs-2 fw-semibold" />
        <span className="text-secondary">{category?.percentage ?? '0.0%'} of spending</span>
      </section>
      <section aria-label="Category spending timeline"><h3 className="fs-6">Spending over time</h3><p className="text-secondary">{report?.rangeLabel ?? 'Loading…'}</p></section>
      <Link className="btn btn-primary" to={`/movements/search?source=posted&type=expense&categoryIds=${encodeURIComponent(categoryId)}`}>View movements</Link>
    </main>
  );
}
