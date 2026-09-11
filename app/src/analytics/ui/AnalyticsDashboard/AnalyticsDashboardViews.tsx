import type { ReactNode } from 'react';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
import type { SpendingReportViewModel } from '../../application/spendingPresenters';
import type { FlowViewModel } from '../../application/flowPresenters';
import type { AnalyticsHighlightViewModel } from '../AnalyticsHighlights/AnalyticsHighlightsView.contract';
import styles from './AnalyticsDashboardViews.module.css';
import type { AnalyticsPeriodNavigationViewModel } from '../AnalyticsPeriodNavigator/AnalyticsPeriodNavigator';
import { AnalyticsPeriodNavigator } from '../AnalyticsPeriodNavigator/AnalyticsPeriodNavigator';

export type AnalyticsSummaryData = { currentWindowLabel: string; previousWindowLabel?: string; comparisonPercent?: string; incomeAmount: string; expenseAmount: string; netFlowAmount: string; incomeShare: number; expenseShare: number; netFlowTone: 'income' | 'expense' | 'neutral'; comparisonTone: 'income' | 'expense' | 'neutral'; comparisonDirection: 'up' | 'down' | 'flat' };
type SummaryData = AnalyticsSummaryData;

export function AnalyticsSummaryView({ data, loading, visibility, periodNavigation = { currentWindowLabel: data.currentWindowLabel, canGoPrevious: false, canGoNext: false, goPrevious: () => undefined, goNext: () => undefined }, onIncomeSelected = () => undefined, onExpensesSelected = () => undefined }: { data: SummaryData; loading: boolean; visibility?: AmountVisibility; periodNavigation?: AnalyticsPeriodNavigationViewModel; onIncomeSelected?: () => void; onExpensesSelected?: () => void }) {
  const amountVisibility = visibility ?? 'visible';
  return <section className={styles.section} aria-label="Saved summary" aria-busy={loading}>
    <div className={styles.summary}>
      <AnalyticsPeriodNavigator label={periodNavigation.currentWindowLabel || data.currentWindowLabel} canGoPrevious={periodNavigation.canGoPrevious} canGoNext={periodNavigation.canGoNext} onPrevious={periodNavigation.goPrevious} onNext={periodNavigation.goNext} />
      {loading ? <SummarySkeleton /> : <>
        <FinancialAmountView formattedAmount={data.netFlowAmount} visibility={amountVisibility} className={styles.hero} />
        {data.comparisonPercent ? <div className={styles.comparison}><span className={data.comparisonTone === 'income' ? styles.comparisonPositive : data.comparisonTone === 'expense' ? styles.comparisonNegative : ''}><span aria-hidden>{data.comparisonDirection === 'up' ? '↑' : data.comparisonDirection === 'down' ? '↓' : '→'}</span> {data.comparisonPercent}</span><span>vs previous period</span></div> : null}
        <div className={styles.totals}><SummaryTotal label="Income" amount={data.incomeAmount} width={data.incomeShare} tone="income" visibility={amountVisibility} onSelect={onIncomeSelected} /><SummaryTotal label="Expenses" amount={data.expenseAmount} width={data.expenseShare} tone="expense" visibility={amountVisibility} onSelect={onExpensesSelected} /></div>
      </>}
    </div>
  </section>;
}

function SummaryTotal({ label, amount, width, tone, visibility, onSelect }: { label: string; amount: string; width: number; tone: 'income' | 'expense'; visibility: AmountVisibility; onSelect: () => void }) {
  return <button type="button" className={styles.total} onClick={onSelect} aria-label={`${label}, ${amount}`}><span className={styles.label}>{label}</span><FinancialAmountView formattedAmount={amount} visibility={visibility} tone={tone} className={styles.amount} /><span className={styles.track} aria-hidden><span className={`${styles.fill} ${tone === 'income' ? styles.incomeFill : styles.expenseFill}`} style={{ width: `${width}%` }} /></span></button>;
}

export function SpendingTimelineView({ report, loading, onSelect = () => undefined }: { report?: SpendingReportViewModel; loading: boolean; onSelect?: (bucket: { start: string; endExclusive: string }) => void }) {
  if (loading && !report) return <DashboardSection title="Spending over time"><ChartSkeleton /></DashboardSection>;
  if (!report || report.chart.bars.length === 0) return <DashboardSection title="Spending over time"><p className={styles.empty}>No timeline data.</p></DashboardSection>;
  return <DashboardSection title="Spending over time"><div className={styles.chart} style={{ gridTemplateColumns: `repeat(${report.chart.bars.length}, minmax(0, 1fr))` }}>{report.chart.bars.map((bar) => <button type="button" className={styles.point} key={bar.start} onClick={() => onSelect({ start: bar.start, endExclusive: bar.endExclusive })} aria-label={`${bar.label}, expenses ${bar.amount}`}><span className={styles.barTrack}><span className={styles.bar} style={{ height: `${Math.max(4, bar.heightPercent)}%` }} /></span><span className={styles.chartLabel}>{bar.label}</span></button>)}</div></DashboardSection>;
}

export function CategoryBreakdownView({ report, loading, visibility, onSelect }: { report?: SpendingReportViewModel; loading: boolean; visibility?: AmountVisibility; onSelect: (categoryId: string) => void }) {
  const categories = report?.allCategories ?? [];
  return <DashboardSection title="By category">{loading && !report ? <ListSkeleton count={5} /> : categories.length === 0 ? <p className={styles.empty}>No spending data.</p> : <div className={styles.list}>{categories.slice(0, 6).map((category) => <button className={`${styles.row} d-grid gap-1`} key={category.key} type="button" onClick={() => onSelect(category.key)}><span className="d-flex align-items-center justify-content-between gap-2"><span className={`${styles.rowMain} flex-grow-1`}><span className={styles.marker} style={{ background: category.color }} /><span className={styles.rowName}>{category.name}</span></span><span className="d-flex align-items-center gap-2 flex-shrink-0 text-nowrap"><FinancialAmountView formattedAmount={category.amount} visibility={visibility ?? 'visible'} className={styles.rowMetric} /><span className={styles.rowMetric}>{category.percentage}</span><i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden /></span></span><span className={styles.progress}><span className={styles.progressFill} style={{ width: `${category.widthPercent}%`, background: category.color }} /></span></button>)}</div>}</DashboardSection>;
}

export function HighlightsView({ items, loading, visibility, onSelect }: { items: AnalyticsHighlightViewModel[]; loading: boolean; visibility?: AmountVisibility; onSelect: (item: AnalyticsHighlightViewModel) => void }) {
  if (!loading && items.length === 0) return null;
  return <DashboardSection title="Highlights">{loading ? <HighlightsSkeleton /> : <div className={styles.list}>{items.slice(0, 4).map((item) => <button className={styles.highlight} key={item.key} type="button" onClick={() => onSelect(item)}><span className={styles.highlightText}><span className={styles.highlightTitle}>{item.label}</span>{item.title ? <strong className={styles.highlightPrimary}>{item.title}</strong> : null}{item.supportingText ? <span className={styles.supporting}>{item.supportingText}</span> : null}</span>{item.formattedAmount ? <FinancialAmountView formattedAmount={item.formattedAmount} visibility={visibility ?? 'visible'} tone={item.tone === 'income' ? 'income' : item.tone === 'expense' ? 'expense' : undefined} className={styles.rowMetric} /> : null}</button>)}</div>}</DashboardSection>;
}

export function TopMerchantsView({ report, loading, visibility, onSelect }: { report?: SpendingReportViewModel; loading: boolean; visibility?: AmountVisibility; onSelect: (merchant: string) => void }) {
  const merchants = report?.merchants ?? [];
  return merchants.length === 0 && !loading ? null : <DashboardSection title="Top merchants">{loading && !report ? <ListSkeleton count={3} /> : <div className={styles.list}>{merchants.slice(0, 5).map((merchant) => <button className={`${styles.row} d-flex align-items-center justify-content-between gap-2`} type="button" key={merchant.merchant} onClick={() => onSelect(merchant.merchant)}><span className="text-truncate">{merchant.merchant}</span><span className="d-flex align-items-center gap-2 flex-shrink-0 text-nowrap"><FinancialAmountView formattedAmount={merchant.amount} visibility={visibility ?? 'visible'} className={styles.rowMetric} /><span className={styles.rowMetric}>{merchant.percentage.toFixed(1)}%</span><i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden /></span></button>)}</div>}</DashboardSection>;
}

export function ForecastSummaryView({ report, loading, visibility, onOpen }: { report?: FlowViewModel; loading: boolean; visibility?: AmountVisibility; onOpen: () => void }) {
  return <DashboardSection title="Forecast"><button type="button" className={styles.forecast} onClick={onOpen} disabled={loading && !report}><span className={styles.forecastHeader}><span className={styles.label}>Expected end balance</span><i className="bi bi-chevron-right" aria-hidden /></span>{report ? <FinancialAmountView formattedAmount={report.summary.end} visibility={visibility ?? 'visible'} className={styles.forecastAmount} /> : <span role="status" aria-label="Loading forecast"><Placeholder className="w-50 fs-4 rounded" /></span>}</button></DashboardSection>;
}

function DashboardSection({ title, children }: { title: string; children: ReactNode }) { return <section className={styles.section} aria-label={title}><h2 className={styles.sectionTitle}>{title}</h2>{children}</section>; }

function Placeholder({ className = 'w-100' }: { className?: string }) {
  return <span className={`placeholder ${className}`} aria-hidden="true">&nbsp;</span>;
}

function SummarySkeleton() {
  return <div role="status" aria-label="Loading summary" className="d-grid gap-3">
    <Placeholder className="w-50 fs-1 rounded" />
    <Placeholder className="w-25 rounded" />
    <div className="d-grid gap-3">
      <div className="d-grid gap-2"><Placeholder className="w-25 rounded" /><Placeholder className="w-50 rounded" /><Placeholder className="w-100 rounded" /></div>
      <div className="d-grid gap-2"><Placeholder className="w-25 rounded" /><Placeholder className="w-50 rounded" /><Placeholder className="w-100 rounded" /></div>
    </div>
  </div>;
}

function HighlightsSkeleton() {
  return <div role="status" aria-label="Loading highlights" className="d-grid gap-3">
    {[1, 2, 3].map((key) => <div className="d-flex justify-content-between gap-3" key={key}><div className="d-grid gap-2 flex-grow-1"><Placeholder className="w-25 rounded" /><Placeholder className="w-50 rounded" /></div><Placeholder className="w-25 rounded" /></div>)}
  </div>;
}

function ChartSkeleton() {
  return <div role="status" aria-label="Loading spending timeline" className="d-flex align-items-end justify-content-between gap-2" style={{ minHeight: '144px' }}>
    {[1, 2, 3, 4, 5].map((key) => <span className="placeholder rounded" key={key} style={{ height: `${32 + key * 12}px`, width: '12px' }} aria-hidden="true" />)}
  </div>;
}

function ListSkeleton({ count }: { count: number }) {
  return <div role="status" aria-label="Loading list" className="d-grid gap-3">{Array.from({ length: count }, (_, index) => <div className="d-grid gap-2" key={index}><div className="d-flex justify-content-between gap-3"><Placeholder className="w-50 rounded" /><Placeholder className="w-25 rounded" /></div><Placeholder className="w-100 rounded" /></div>)}</div>;
}
