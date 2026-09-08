import type { AnalyticsPeriod, AnalyticsViewMode } from '../application/analyticsFilters';
import { analyticsPeriodChipLabel } from '../application/analyticsFilters';
import styles from './AnalyticsPageView.module.css';

type AnalyticsFilterBarViewProps = {
  required: {
    state: {
      currency: string;
      period: AnalyticsPeriod;
      tagsSelected: boolean;
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
      openTagSheet: () => void;
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
        className={`btn btn-sm rounded-pill d-inline-flex flex-shrink-0 align-items-center gap-2 text-nowrap${state.tagsSelected ? ' bg-success-subtle text-success-emphasis' : ''}`}
        onClick={provided.commands.openTagSheet}
        disabled={status.disabled}
        aria-label="Open tags filter"
      >
        <i className="bi bi-tag" aria-hidden />
        <span>Tags</span>
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

export type AnalyticsViewTabsViewProps = {
  required: {
    state: {
      viewMode: AnalyticsViewMode;
    };
  };
  provided: {
    commands: {
      selectViewMode: (viewMode: AnalyticsViewMode) => void;
    };
  };
};

const VIEW_TABS: Array<{ value: AnalyticsViewMode; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'spending', label: 'Spending' },
  { value: 'cashFlow', label: 'Flow' },
];

export function AnalyticsViewTabsView({ required, provided }: AnalyticsViewTabsViewProps) {
  return (
    <div className="nav nav-underline nav-fill" role="tablist" aria-label="Analytics views">
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`nav-link fw-semibold${required.state.viewMode === tab.value ? ' active' : ''}`}
          role="tab"
          aria-selected={required.state.viewMode === tab.value}
          onClick={() => provided.commands.selectViewMode(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
