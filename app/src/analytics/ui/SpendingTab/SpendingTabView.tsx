import type { CSSProperties } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import { Link } from 'react-router-dom';
import { OverviewStarterItemView } from '../OverviewStarters/OverviewStarterItemView';
import type { OverviewStarterItemView as OverviewStarterItem } from '../OverviewStarters/OverviewStartersView.contract';
import type { SpendingTabViewProps } from './SpendingTabView.contract';
import styles from './SpendingTabView.module.css';

export function SpendingTabView({ required, provided }: SpendingTabViewProps) {
  const report = required.report;
  const top = required.topExpenses;
  const topItems: OverviewStarterItem[] = (top?.items ?? []).map((item) => ({
    key: item.key,
    label: item.subtitle,
    primaryText: item.title,
    amount: item.amount,
    supportingText: item.date,
    tone: 'expense',
    icon: 'expense',
  }));
  return <div className={styles.stack}>
    <section className={styles.mainCard} aria-label="Spending summary" aria-busy={required.status.reportLoading}>
      <div className={styles.header}><div><h2 className={styles.title}>Total spending</h2></div>{report?.comparison ? <span className={`${styles.comparison} ${styles[report.comparison.direction]}`}><strong>{report.comparison.direction === 'up' ? '+' : report.comparison.direction === 'down' ? '-' : ''}{report.comparison.percentage}</strong><span>vs previous period</span></span> : null}</div>
      {required.status.reportLoading ? <p className={styles.skeleton} role="status" aria-label="Loading spending summary">Loading…</p> : required.status.reportError ? <p className={styles.error}>{required.status.reportError}</p> : report ? <><strong className={styles.total}>{report.totalAmount}</strong><div className={styles.nav}><button type="button" aria-label="Previous spending window" disabled={!provided.state.canPrevious} onClick={provided.commands.previous}>‹</button><span className={styles.range} aria-label={report.rangeLabel}><span>{report.range.start}</span> <small>{report.range.sameYear ? '' : report.range.startYear}</small> <span>–</span> <span>{report.range.end}</span> <small>{report.range.endYear}</small></span><button type="button" aria-label="Next spending window" disabled={!provided.state.canNext} onClick={provided.commands.next}>›</button></div><div className={styles.chart} style={{ '--chart-columns': Math.max(report.chart.bars.length, 1) } as CSSProperties} aria-label="Spending over time">{report.chart.bars.map((bar) => <div className={styles.barColumn} key={`${bar.label}-${bar.amount}`}><span className={styles.track}><span className={styles.bar} style={{ height: `${bar.heightPercent}%` }} aria-label={`${bar.label}: ${bar.amount}`} /></span><span className={styles.barLabel}>{bar.label}</span></div>)}</div></> : <p className={styles.empty}>No spending data.</p>}
    </section>
    <section className={styles.section} aria-label="Spending by category" aria-busy={required.status.reportLoading}><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Spending by category</h2>{report && report.allCategories.length > report.categories.length ? <button type="button" className={styles.seeAll} onClick={provided.commands.openCategories}>See all</button> : null}</div>{report?.categories.length ? <div className={styles.categories}>{report.categories.map((category) => <div className={styles.category} key={category.key}><span className={styles.icon} style={{ background: `${category.color}33`, color: category.color }} aria-hidden><i className={category.icon} /></span><div className={styles.categoryBody}><div className={styles.categoryMeta}><strong>{category.name}</strong><span>{category.amount} · {category.percentage}</span></div><span className={styles.barTrack}><span className={styles.categoryBar} style={{ width: `${category.widthPercent}%`, background: category.color }} /></span></div></div>)}</div> : <p className={styles.empty}>No spending data.</p>}</section>
    {required.status.topError ? <section className={styles.section} aria-label="Top expenses"><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Top expenses</h2></div><p className={styles.error}>{required.status.topError}</p></section> : <section className={styles.section} aria-label="Top expenses" aria-busy={required.status.topLoading}><div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Top expenses</h2>{top && top.totalCount > 4 && required.topExpensesSearchHref ? <Link className={styles.seeAll} to={required.topExpensesSearchHref}>See all</Link> : null}</div>{required.status.topLoading ? <p className={styles.skeleton} role="status" aria-label="Loading top expenses">Loading…</p> : topItems.length > 0 ? <ul className={styles.topGrid}>{topItems.slice(0, 4).map((item) => <OverviewStarterItemView item={item} key={item.key} />)}</ul> : <p className={styles.empty}>No expenses found.</p>}</section>}
    <SheetView required={{ config: { ariaLabel: 'All spending categories', title: 'Spending by category', closeLabel: 'Close spending categories', showHandle: true }, data: { body: <div className={styles.categories}>{report?.allCategories.map((category) => <div className={styles.category} key={category.key}><span className={styles.icon} style={{ background: `${category.color}33`, color: category.color }} aria-hidden><i className={category.icon} /></span><strong>{category.name}</strong><span>{category.amount}</span></div>)}</div> }, state: { open: provided.state.sheetOpen === 'categories' }, status: {} }} provided={{ commands: { close: provided.commands.closeSheet } }} />
  </div>;
}
