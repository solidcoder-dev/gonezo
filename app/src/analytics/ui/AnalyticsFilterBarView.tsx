import type { AnalyticsPeriodPreset, AnalyticsViewMode } from '../application/analyticsFilters';
import styles from './AnalyticsPageView.module.css';

type AnalyticsFilterBarViewProps = {
  required: {
    state: {
      currency: string;
      period: AnalyticsPeriodPreset;
      tagsSelected: boolean;
      moreFiltersSelected: boolean;
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

function periodLabel(period: AnalyticsPeriodPreset): string {
  return period === 'ALL' ? 'All' : period;
}

export function AnalyticsFilterBarView({ required, provided }: AnalyticsFilterBarViewProps) {
  const { state, status } = required;

  return (
    <div className={styles.filterBar} aria-label="Analytics filters">
      <button
        type="button"
        className={state.currency ? styles.filterChip : styles.filterChipMuted}
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
        className={styles.filterChip}
        onClick={provided.commands.openPeriodSheet}
        disabled={status.disabled}
        aria-label="Open period filter"
      >
        <i className="bi bi-calendar4" aria-hidden />
        <span>{periodLabel(state.period)}</span>
        <i className="bi bi-chevron-down" aria-hidden />
      </button>

      <button
        type="button"
        className={state.tagsSelected ? styles.filterChipSelected : styles.filterChip}
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
        className={state.moreFiltersSelected ? styles.moreFiltersButtonSelected : styles.moreFiltersButton}
        onClick={provided.commands.openMoreFiltersSheet}
        disabled={status.disabled}
        aria-label="Open more filters"
      >
        <i className="bi bi-sliders2" aria-hidden />
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
    <div className={styles.viewTabs} role="tablist" aria-label="Analytics views">
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={required.state.viewMode === tab.value ? styles.viewTabActive : styles.viewTab}
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
