import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import { FinancialAmountView } from '../../shared/ui/FinancialAmount/FinancialAmountView';
import { buildMovementSearchHref } from '../../movements/application/movementsSearchRoutePreset';
import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { normalizeAnalyticsPeriodInput } from './analyticsFilters';
import { presentSpendingSummary, type SpendingReportViewModel } from './spendingPresenters';
import { serializeAnalyticsContext } from './analyticsContext';
import styles from '../ui/AnalyticsDashboard/AnalyticsDashboardViews.module.css';

export function AnalyticsCategoryDetailComponent({ core, categoryId, currency, filters, refreshSignal, amountVisibility, onError }: {
  core: AnalyticsPort;
  categoryId: string;
  currency: string;
  filters?: AnalyticsFiltersInput;
  refreshSignal: boolean;
  amountVisibility?: AmountVisibility;
  onError?: (error: { message: string }) => void;
}) {
  const [report, setReport] = useState<SpendingReportViewModel>();
  useEffect(() => {
    if (!currency || !core.analyticsGetSpendingReport) return undefined;
    let active = true;
    void core.analyticsGetSpendingReport({ currency, filters, categoryId, periodSelection: { period: normalizeAnalyticsPeriodInput(filters?.period), shift: 0 } })
      .then((result) => { if (active) setReport(presentSpendingSummary(result)); })
      .catch((error: unknown) => { if (active) onError?.({ message: error instanceof Error ? error.message : 'Unable to load category' }); });
    return () => { active = false; };
  }, [categoryId, core, currency, filters, onError, refreshSignal]);

  const category = report?.allCategories[0];
  const visibility = amountVisibility ?? 'visible';
  const movementSearchHref = buildMovementSearchHref({ source: 'posted', type: 'expense', categoryIds: categoryId === 'uncategorized' ? undefined : [categoryId], fromDate: report?.window.start, toDate: report?.window.endExclusive ? previousDate(report.window.endExclusive) : undefined });
  const contextQuery = serializeAnalyticsContext(filters ?? {});
  const href = contextQuery ? `${movementSearchHref}&${contextQuery}` : movementSearchHref;
  return <main className="d-grid gap-4" aria-label="Category detail">
    <div><h2 className="m-0">{category?.name ?? (categoryId === 'uncategorized' ? 'Uncategorized' : 'Category')}</h2><p className="text-secondary mb-0">{report?.rangeLabel ?? 'Loading…'}</p></div>
    <section className={styles.section} aria-label="Category summary"><h3 className={styles.sectionTitle}>Total spent</h3><FinancialAmountView formattedAmount={category?.amount ?? report?.totalAmount ?? '0.00'} visibility={visibility} className={styles.hero} /><span className={styles.metadata}>{category?.percentage ?? '0.0%'} of total spending{report?.comparison ? ` · ${report.comparison.direction === 'up' ? '+' : report.comparison.direction === 'down' ? '-' : ''}${report.comparison.percentage} vs previous period` : ''}</span></section>
    <section className={styles.section} aria-label="Category spending timeline"><h3 className={styles.sectionTitle}>Spending over time</h3>{report ? <div className={styles.chart} style={{ gridTemplateColumns: `repeat(${report.chart.bars.length}, minmax(0, 1fr))` }}>{report.chart.bars.map((bar) => <span className={styles.barTrack} key={bar.label}><span className={styles.bar} style={{ height: `${Math.max(4, bar.heightPercent)}%` }} /></span>)}</div> : <p className={styles.empty}>Loading timeline…</p>}</section>
    <section className={styles.section} aria-label="Category top merchants"><h3 className={styles.sectionTitle}>Top merchants</h3>{report?.merchants?.length ? <div className={styles.list}>{report.merchants.slice(0, 5).map((merchant) => <div className={styles.row} key={merchant.merchant}><span className={styles.rowHeader}><span className={styles.rowName}>{merchant.merchant}</span><FinancialAmountView formattedAmount={merchant.amount} visibility={visibility} className={styles.rowMetric} /><span className={styles.rowMetric}>{merchant.percentage.toFixed(1)}%</span></span></div>)}</div> : <p className={styles.empty}>No merchants for this category.</p>}</section>
    <Link className="btn btn-primary" to={href}>View {category ? `${category.name.toLowerCase()} ` : ''}movements</Link>
  </main>;
}

function previousDate(endExclusive: string): string {
  const date = new Date(`${endExclusive}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
