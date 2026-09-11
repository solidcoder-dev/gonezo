import type { AnalyticsPeriod } from '../application/analyticsFilters';
import { analyticsPeriodChipLabel } from '../application/analyticsFilters';
import styles from './AnalyticsPageView.module.css';

type AnalyticsFilterBarViewProps = {
  required: {
    state: {
      currency: string;
      period: AnalyticsPeriod;
      moreFiltersCount: number;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      openCurrencySheet: () => void;
      openPeriodSheet: () => void;
      openMoreFiltersSheet: () => void;
    };
  };
};

export function AnalyticsFilterBarView({ required, provided }: AnalyticsFilterBarViewProps) {
  const { state, status } = required;

  return (
    <div className={`${styles.filterBar} d-flex flex-nowrap align-items-center gap-2 overflow-x-auto`} role="group" aria-label="Analytics filters">
      <button
        type="button"
        className="btn btn-sm rounded-pill d-inline-flex flex-shrink-0 align-items-center gap-2 text-nowrap"
        onClick={provided.commands.openCurrencySheet}
        disabled={status.disabled}
        aria-label="Open currency filter"
      >
        <i className="bi bi-globe2" aria-hidden />
        <span>{state.currency || 'Currency'}</span>
        <i className="bi bi-chevron-down" aria-hidden />
      </button>

      <button
        type="button"
        className="btn btn-sm rounded-pill d-inline-flex flex-shrink-0 align-items-center gap-2 text-nowrap"
        onClick={provided.commands.openPeriodSheet}
        disabled={status.disabled}
        aria-label="Open period filter"
      >
        <i className="bi bi-calendar4" aria-hidden />
        <span>{analyticsPeriodChipLabel(state.period)}</span>
        <i className="bi bi-chevron-down" aria-hidden />
      </button>

      <button
        type="button"
        className={`btn btn-sm rounded-pill position-relative d-inline-flex flex-shrink-0 align-items-center gap-2${state.moreFiltersCount > 0 ? ' bg-success-subtle text-success-emphasis' : ''}`}
        onClick={provided.commands.openMoreFiltersSheet}
        disabled={status.disabled}
        aria-label="Open more filters"
      >
        <i className="bi bi-sliders2" aria-hidden />
        {state.moreFiltersCount > 0 ? <span className="badge text-bg-primary">{state.moreFiltersCount}</span> : null}
      </button>
    </div>
  );
}
