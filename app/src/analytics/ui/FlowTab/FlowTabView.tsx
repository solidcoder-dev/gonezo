import { BalanceProjectionChartView } from '../../../shared/ui/Chart/BalanceProjectionChartView';
import type { FlowTabViewProps } from './FlowTabView.contract';
import styles from './FlowTabView.module.css';

export function FlowTabView({ required, provided }: FlowTabViewProps) {
  const report = required.report;
  if (required.status.loading && !report) return <div className={styles.stack} aria-busy="true"><section className={styles.card}><p className={styles.loading}>Loading flow report…</p></section><section className={styles.section}><h2>Flow insights</h2><p className={styles.loading}>Loading insights…</p></section></div>;
  if (required.status.error) return <div className={styles.stack}><section className={styles.card}><p className={styles.error}>{required.status.error}</p></section></div>;
  if (!report) return <div className={styles.stack}><section className={styles.card}><p className={styles.empty}>No accounts available for this currency.</p></section></div>;
  return <div className={styles.stack} aria-busy={required.status.loading}>
    <section className={styles.card} aria-label="Flow summary">
      <div className={styles.summary}><div className={styles.metric}><span>{report.summary.openingLabel}</span><strong>{report.summary.opening}</strong></div><div className={styles.metric}><span>{report.summary.endLabel}</span><strong>{report.summary.end}</strong></div><div className={styles.metric}><span>Lowest point</span><strong className={styles.negative}>{report.summary.lowest}</strong><span className={styles.supporting}>on {report.summary.lowestDate}</span></div></div>
      <div className={styles.chartHeader}><h2>Balance projection</h2></div><div className={styles.nav}><button type="button" aria-label="Previous flow window" disabled={!provided.state.canPrevious} onClick={provided.commands.previous}><i className="bi bi-chevron-left" aria-hidden="true" /></button><span className={styles.range}>{report.windowLabel}</span><button type="button" aria-label="Next flow window" disabled={!provided.state.canNext} onClick={provided.commands.next}><i className="bi bi-chevron-right" aria-hidden="true" /></button></div>
      <div className={styles.chart} aria-label="Balance projection chart"><BalanceProjectionChartView currentMarkerAt={report.chart.currentMarkerAt} lowestAt={report.chart.lowestAt} domain={report.chart.domain} ticks={report.chart.ticks} points={report.chart.points} /></div>
      <div className={styles.upcoming}><div className={styles.upcomingItem}><span className={styles.icon} aria-hidden><i className="bi bi-arrow-down-left" /></span><div><strong>{report.upcoming.incoming}</strong><span className={styles.supporting}>Upcoming money in · {report.upcoming.incomingText}</span></div></div><div className={`${styles.upcomingItem} ${styles.expense}`}><span className={styles.icon} aria-hidden><i className="bi bi-arrow-up-right" /></span><div><strong>{report.upcoming.outgoing}</strong><span className={styles.supporting}>Upcoming money out · {report.upcoming.outgoingText}</span></div></div></div>
    </section>
    <section className={styles.section} aria-label="Flow insights"><h2>Flow insights</h2><div className={styles.insights}>{report.insights.map((item) => <article className={`${styles.insight} ${styles[item.tone]}`} key={item.key}><span className={styles.icon} aria-hidden><i className={item.icon} /></span><div className={styles.insightText}><strong>{item.title}</strong><span className={styles.supporting}>{item.supportingText}</span><strong className={styles.amount}>{item.amount}</strong></div></article>)}</div></section>
  </div>;
}
