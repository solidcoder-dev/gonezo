import type { AnalyticsPort } from './analytics.port';
import {
  AnalyticsFilterBarView,
  AnalyticsViewTabsView,
} from '../ui/AnalyticsFilterBarView';
import { CashFlowChartCardComponent } from './CashFlowChartCardComponent';
import { OverviewInsightsRailComponent } from './OverviewInsightsRailComponent';
import { OverviewSnapshotCardComponent } from './OverviewSnapshotCardComponent';
import { SpendingOverviewCardComponent } from './SpendingOverviewCardComponent';
import { useAnalyticsFiltersModel } from './useAnalyticsFiltersModel';
import styles from '../ui/AnalyticsPageView.module.css';

export type AnalyticsPageComponentProps = {
  required: {
    context: {
      core: AnalyticsPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
    };
  };
};

export function AnalyticsPageComponent({ required, provided }: AnalyticsPageComponentProps) {
  const filterModel = useAnalyticsFiltersModel({
    core: required.context.core,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    onError: provided?.events?.onError,
  });
  const currency = filterModel.filters.currency;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1>Analytics</h1>
        <button type="button" className={styles.notificationButton} aria-label="Notifications">
          <i className="bi bi-bell" aria-hidden />
        </button>
      </div>

      <AnalyticsViewTabsView
        required={{ state: { viewMode: filterModel.viewMode } }}
        provided={{ commands: { selectViewMode: filterModel.provided.commands.selectViewMode } }}
      />
      <AnalyticsFilterBarView
        required={filterModel.required}
        provided={filterModel.provided}
      />

      {filterModel.viewMode === 'overview' ? (
        <div className={styles.stack}>
          <OverviewSnapshotCardComponent
            required={{
              context: { core: required.context.core },
              config: {
                enabled: required.config.enabled,
                currency,
                filters: filterModel.filters,
                refreshSignal: required.config.refreshSignal,
              },
            }}
            provided={provided}
          />
          <OverviewInsightsRailComponent
            required={{
              context: { core: required.context.core },
              config: {
                enabled: required.config.enabled,
                currency,
                filters: filterModel.filters,
                refreshSignal: required.config.refreshSignal,
              },
            }}
            provided={provided}
          />
        </div>
      ) : filterModel.viewMode === 'spending' ? (
        <SpendingOverviewCardComponent
          required={{
            context: { core: required.context.core },
            config: {
              enabled: required.config.enabled,
              currency,
              filters: filterModel.filters,
              refreshSignal: required.config.refreshSignal,
            },
          }}
          provided={provided}
        />
      ) : filterModel.viewMode === 'cashFlow' ? (
        <CashFlowChartCardComponent
          required={{
            context: { core: required.context.core },
            config: {
              enabled: required.config.enabled,
              currency,
              filters: filterModel.filters,
              refreshSignal: required.config.refreshSignal,
            },
          }}
          provided={provided}
        />
      ) : (
        <div className={styles.emptyView} aria-label={`${filterModel.viewMode} analytics view`} />
      )}
    </section>
  );
}
