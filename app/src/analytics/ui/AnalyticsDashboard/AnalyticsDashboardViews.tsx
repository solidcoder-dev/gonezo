import type { ReactNode } from 'react';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
import type { SpendingReportViewModel } from '../../application/spendingPresenters';
import type { FlowViewModel } from '../../application/flowPresenters';
import type { OverviewSnapshotCardViewProps } from '../OverviewSnapshotCard/OverviewSnapshotCardView.contract';
import type { OverviewStarterItemView } from '../OverviewStarters/OverviewStartersView.contract';
import styles from './AnalyticsDashboardViews.module.css';

type SummaryData = OverviewSnapshotCardViewProps['required']['data'];

export function AnalyticsSummaryView({ data, loading, visibility }: { data: SummaryData; loading: boolean; visibility?: AmountVisibility }) {
  const amountVisibility = visibility ?? 'visible';
  return <section className={styles.section} aria-label="Saved summary" aria-busy={loading}>
    <div className={styles.summary}>
      <div><h2 className={styles.sectionTitle}>Saved</h2><p className={styles.metadata}>{data.currentWindowLabel}{data.previousWindowLabel ? ` · ${data.previousWindowLabel}` : ''}</p></div>
      {loading ? <p className={styles.empty}>Loading summary…</p> : <>
        <FinancialAmountView formattedAmount={data.netFlowAmount} visibility={amountVisibility} className={styles.hero} />
        {data.comparisonPercent ? <div className={`${styles.comparison} ${data.comparisonTone === 'income' ? styles.comparisonPositive : data.comparisonTone === 'expense' ? styles.comparisonNegative : ''}`}><span aria-hidden>{data.comparisonDirection === 'up' ? '↑' : data.comparisonDirection === 'down' ? '↓' : '→'}</span><span>{data.comparisonPercent} vs previous period</span></div> : null}
        <div className={styles.totals}><SummaryTotal label="Income" amount={data.incomeAmount} width={data.incomeShare} tone="income" visibility={amountVisibility} /><SummaryTotal label="Expenses" amount={data.expenseAmount} width={data.expenseShare} tone="expense" visibility={amountVisibility} /></div>
      </>}
    </div>
  </section>;
}

function SummaryTotal({ label, amount, width, tone, visibility }: { label: string; amount: string; width: number; tone: 'income' | 'expense'; visibility: AmountVisibility }) {
  return <div className={styles.total}><span className={styles.label}>{label}</span><FinancialAmountView formattedAmount={amount} visibility={visibility} tone={tone} className={styles.amount} /><span className={styles.track} aria-hidden><span className={`${styles.fill} ${tone === 'income' ? styles.incomeFill : styles.expenseFill}`} style={{ width: `${width}%` }} /></span></div>;
}

export function SpendingTimelineView({ report, loading }: { report?: SpendingReportViewModel; loading: boolean }) {
  if (loading && !report) return <DashboardSection title="Spending over time"><p className={styles.empty}>Loading timeline…</p></DashboardSection>;
  if (!report || report.chart.bars.length === 0) return <DashboardSection title="Spending over time"><p className={styles.empty}>No timeline data.</p></DashboardSection>;
  return <DashboardSection title="Spending over time"><div className={styles.chart} style={{ gridTemplateColumns: `repeat(${report.chart.bars.length}, minmax(0, 1fr))` }}>{report.chart.bars.map((bar) => <div className={styles.point} key={bar.label}><span className={styles.barTrack}><span className={styles.bar} style={{ height: `${Math.max(4, bar.heightPercent)}%` }} /></span><span className={styles.chartLabel}>{bar.label}</span></div>)}</div></DashboardSection>;
}

export function CategoryBreakdownView({ report, loading, visibility, onSelect }: { report?: SpendingReportViewModel; loading: boolean; visibility?: AmountVisibility; onSelect: (categoryId: string) => void }) {
  const categories = report?.allCategories ?? [];
  return <DashboardSection title="By category">{loading && !report ? <p className={styles.empty}>Loading categories…</p> : categories.length === 0 ? <p className={styles.empty}>No spending data.</p> : <div className={styles.list}>{categories.slice(0, 6).map((category) => <button className={styles.row} key={category.key} type="button" onClick={() => onSelect(category.key)}><span className={styles.rowHeader}><span className={styles.rowMain}><span className={styles.marker} style={{ background: category.color }} /><span className={styles.rowName}>{category.name}</span></span><FinancialAmountView formattedAmount={category.amount} visibility={visibility ?? 'visible'} className={styles.rowMetric} /><span className={styles.rowMetric}>{category.percentage}</span><i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden /></span><span className={styles.progress}><span className={styles.progressFill} style={{ width: `${category.widthPercent}%`, background: category.color }} /></span></button>)}</div>}</DashboardSection>;
}

export function HighlightsView({ items, loading, visibility, onSelect }: { items: OverviewStarterItemView[]; loading: boolean; visibility?: AmountVisibility; onSelect: (item: OverviewStarterItemView) => void }) {
  const useful = items.filter((item) => item.primaryText || item.amount !== '€0.00').slice(0, 4);
  return <DashboardSection title="Highlights">{loading ? <p className={styles.empty}>Loading highlights…</p> : useful.length === 0 ? <p className={styles.empty}>No highlights for this period.</p> : <div className={styles.list}>{useful.map((item) => <button className={styles.highlight} key={item.key} type="button" onClick={() => onSelect(item)}><span className={styles.highlightText}><span className={styles.highlightTitle}>{item.label}</span><strong className={styles.highlightPrimary}>{item.primaryText}</strong></span><FinancialAmountView formattedAmount={item.amount} visibility={visibility ?? 'visible'} tone={item.tone === 'income' ? 'income' : item.tone === 'expense' ? 'expense' : undefined} className={styles.rowMetric} /></button>)}</div>}</DashboardSection>;
}

export function TopMerchantsView({ report, loading, visibility, onSelect }: { report?: SpendingReportViewModel; loading: boolean; visibility?: AmountVisibility; onSelect: (merchant: string) => void }) {
  const merchants = report?.merchants ?? [];
  return merchants.length === 0 && !loading ? null : <DashboardSection title="Top merchants">{loading && !report ? <p className={styles.empty}>Loading merchants…</p> : <div className={styles.list}>{merchants.slice(0, 5).map((merchant) => <button className={styles.row} type="button" key={merchant.merchant} onClick={() => onSelect(merchant.merchant)}><span className={styles.rowHeader}><span className={styles.rowName}>{merchant.merchant}</span><FinancialAmountView formattedAmount={merchant.amount} visibility={visibility ?? 'visible'} className={styles.rowMetric} /><span className={styles.rowMetric}>{merchant.percentage.toFixed(1)}%</span><i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden /></span></button>)}</div>}</DashboardSection>;
}

export function ForecastSummaryView({ report, loading, visibility, onOpen }: { report?: FlowViewModel; loading: boolean; visibility?: AmountVisibility; onOpen: () => void }) {
  return <DashboardSection title="Forecast"><button type="button" className={styles.forecast} onClick={onOpen} disabled={loading && !report}><span className={styles.forecastHeader}><span className={styles.label}>Expected end balance</span><i className="bi bi-chevron-right" aria-hidden /></span>{report ? <FinancialAmountView formattedAmount={report.summary.end} visibility={visibility ?? 'visible'} className={styles.forecastAmount} /> : <span className={styles.empty}>Loading forecast…</span>}</button></DashboardSection>;
}

function DashboardSection({ title, children }: { title: string; children: ReactNode }) { return <section className={styles.section} aria-label={title}><h2 className={styles.sectionTitle}>{title}</h2>{children}</section>; }
