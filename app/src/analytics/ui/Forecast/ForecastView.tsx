import { BalanceProjectionChartView } from '../../../shared/ui/Chart/BalanceProjectionChartView';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import type { ForecastViewProps } from './ForecastView.contract';

export function ForecastView({ required, provided }: ForecastViewProps) {
  const report = required.report;
  if (required.status.loading && !report) return <div role="status" aria-label="Loading forecast" className="d-grid gap-3"><span className="placeholder w-50 fs-4 rounded" aria-hidden="true">&nbsp;</span><span className="placeholder w-100 rounded" aria-hidden="true">&nbsp;</span><span className="placeholder w-100 rounded" aria-hidden="true">&nbsp;</span></div>;
  if (required.status.error) return <p role="alert">{required.status.error}</p>;
  if (!report) return <p>No accounts available for this currency.</p>;
  const visibility = required.status.amountVisibility ?? 'visible';
  const isHistory = report.windowRelation === 'past';
  return <div className="d-grid gap-4" aria-busy={required.status.loading}>
    <section className="d-grid gap-3" aria-label={isHistory ? 'Balance history' : 'Forecast'}>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
        <span className="text-secondary">{report.summary.openingLabel}<br /><FinancialAmountView formattedAmount={report.summary.opening} visibility={visibility} /></span>
        <span className="fs-3 fw-semibold">{report.summary.endLabel}<br /><FinancialAmountView formattedAmount={report.summary.end} visibility={visibility} /></span>
        <span className="text-secondary">Lowest point<br /><FinancialAmountView formattedAmount={report.summary.lowest} visibility={visibility} /></span>
      </div>
      <h2 className="fs-6 text-uppercase m-0">Balance projection</h2>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <button type="button" className="btn btn-link" aria-label={`Previous ${isHistory ? 'history' : 'forecast'} window`} disabled={!provided.state.canPrevious} onClick={provided.commands.previous}><i className="bi bi-chevron-left" aria-hidden /></button>
        <span className="text-secondary text-center">{report.windowLabel}</span>
        <button type="button" className="btn btn-link" aria-label={`Next ${isHistory ? 'history' : 'forecast'} window`} disabled={!provided.state.canNext} onClick={provided.commands.next}><i className="bi bi-chevron-right" aria-hidden /></button>
      </div>
      <div aria-label="Balance projection chart"><BalanceProjectionChartView currentMarkerAt={report.chart.currentMarkerAt} lowestAt={report.chart.lowestAt} domain={report.chart.domain} ticks={report.chart.ticks} points={report.chart.points} /></div>
    </section>
    <section className="d-grid gap-3" aria-label="Upcoming">
      <h2 className="fs-6 text-uppercase m-0">Upcoming</h2>
      {isHistory ? <p className="text-secondary m-0">This period has ended; future movements are not projected here.</p> : <div className="d-grid gap-2"><span>Money in · <FinancialAmountView formattedAmount={report.upcoming.incoming} visibility={visibility} /></span><span>Money out · <FinancialAmountView formattedAmount={report.upcoming.outgoing} visibility={visibility} /></span></div>}
    </section>
    <section className="d-grid gap-3" aria-label="Insights"><h2 className="fs-6 text-uppercase m-0">Insights</h2>{report.insights.filter((item) => item.amount !== '0.00').map((item) => <div className="d-flex justify-content-between gap-3" key={item.key}><span>{item.title}<br /><small className="text-secondary">{item.supportingText}</small></span><FinancialAmountView formattedAmount={item.amount} visibility={visibility} /></div>)}</section>
  </div>;
}
