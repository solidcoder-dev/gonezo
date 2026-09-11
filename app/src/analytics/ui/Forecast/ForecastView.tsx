import { BalanceProjectionChartView } from '../../../shared/ui/Chart/BalanceProjectionChartView';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { ForecastViewProps } from './ForecastView.contract';

export function ForecastView({ required, provided }: ForecastViewProps) {
  const report = required.report;
  if (required.status.loading && !report) return <p role="status">Loading forecast…</p>;
  if (required.status.error) return <p role="alert">{required.status.error}</p>;
  if (!report) return <p>No accounts available for this currency.</p>;
  const visibility = required.status.amountVisibility ?? 'visible';
  return <div className="d-grid gap-4" aria-busy={required.status.loading}>
    <section className="d-grid gap-3" aria-label="Balance projection"><div className="d-flex justify-content-between gap-3"><span>{report.summary.openingLabel}<br /><FinancialAmountView formattedAmount={report.summary.opening} visibility={visibility} /></span><span>{report.summary.endLabel}<br /><FinancialAmountView formattedAmount={report.summary.end} visibility={visibility} /></span><span>Lowest point<br /><FinancialAmountView formattedAmount={report.summary.lowest} visibility={visibility} /></span></div><h3 className="fs-6 m-0">Balance projection</h3><div className="d-flex align-items-center justify-content-between gap-3"><button type="button" className="btn btn-link" aria-label="Previous forecast window" disabled={!provided.state.canPrevious} onClick={provided.commands.previous}><i className="bi bi-chevron-left" aria-hidden /></button><span className="text-secondary text-center">{report.windowLabel}</span><button type="button" className="btn btn-link" aria-label="Next forecast window" disabled={!provided.state.canNext} onClick={provided.commands.next}><i className="bi bi-chevron-right" aria-hidden /></button></div><div aria-label="Balance projection chart"><BalanceProjectionChartView currentMarkerAt={report.chart.currentMarkerAt} lowestAt={report.chart.lowestAt} domain={report.chart.domain} ticks={report.chart.ticks} points={report.chart.points} /></div><div className="d-grid gap-2"><span>Upcoming money in · <FinancialAmountView formattedAmount={report.upcoming.incoming} visibility={visibility} /></span><span>Upcoming money out · <FinancialAmountView formattedAmount={report.upcoming.outgoing} visibility={visibility} /></span></div></section>
    <section className="d-grid gap-3" aria-label="Forecast insights"><h3 className="fs-6 m-0">Forecast insights</h3>{report.insights.filter((item) => item.amount !== '0.00').map((item) => <div className="d-flex justify-content-between gap-3" key={item.key}><span>{item.title}<br /><small className="text-secondary">{item.supportingText}</small></span><FinancialAmountView formattedAmount={item.amount} visibility={visibility} /></div>)}</section>
  </div>;
}
