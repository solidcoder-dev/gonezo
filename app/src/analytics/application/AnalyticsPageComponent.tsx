import type { AnalyticsPort } from './analytics.port';
import {
  AnalyticsFilterBarView,
  AnalyticsViewTabsView,
} from '../ui/AnalyticsFilterBarView';
import { AnalyticsCurrencySheetView } from '../ui/AnalyticsCurrencySheetView';
import { AnalyticsMoreFiltersSheetView } from '../ui/AnalyticsMoreFiltersSheetView';
import { AnalyticsPeriodSheetView } from '../ui/AnalyticsPeriodSheetView';
import { AnalyticsTagsSheetView } from '../ui/AnalyticsTagsSheetView';
import { OverviewInsightsRailComponent } from './OverviewInsightsRailComponent';
import { OverviewSnapshotCardComponent } from './OverviewSnapshotCardComponent';
import { FlowTabComponent } from './FlowTabComponent';
import { SpendingTabComponent } from './SpendingTabComponent';
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
        provided={{ commands: { selectViewMode: filterModel.commands.selectViewMode } }}
      />
      <AnalyticsFilterBarView
        required={{
          state: {
            currency: filterModel.filters.currency,
            period: filterModel.filters.period,
            tagsSelected: filterModel.filters.tagIds.length > 0,
            moreFiltersSelected: filterModel.filters.accountIds.length > 0 || filterModel.filters.includeIgnoredMovements,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            openCurrencySheet: filterModel.commands.openCurrencySheet,
            openPeriodSheet: filterModel.commands.openPeriodSheet,
            openTagSheet: filterModel.commands.openTagSheet,
            openMoreFiltersSheet: filterModel.commands.openMoreFiltersSheet,
          },
        }}
      />
      <AnalyticsCurrencySheetView
        required={{
          data: { currencies: filterModel.currencies },
          state: {
            open: filterModel.currencySheetOpen,
            draftCurrency: filterModel.draftCurrency,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            close: filterModel.commands.closeCurrencySheet,
            setDraftCurrency: filterModel.commands.setDraftCurrency,
            applyDraftCurrency: filterModel.commands.applyDraftCurrency,
          },
        }}
      />
      <AnalyticsPeriodSheetView
        required={{
          state: {
            open: filterModel.periodSheetOpen,
            draftPeriod: filterModel.draftPeriod,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            close: filterModel.commands.closePeriodSheet,
            setDraftPeriod: filterModel.commands.setDraftPeriod,
            applyDraftPeriod: filterModel.commands.applyDraftPeriod,
          },
        }}
      />
      <AnalyticsTagsSheetView
        required={{
          data: { tags: filterModel.availableTags },
          state: {
            open: filterModel.tagSheetOpen,
            draftTagIds: filterModel.draftTagIds,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            close: filterModel.commands.closeTagSheet,
            toggleDraftTagId: filterModel.commands.toggleDraftTagId,
            resetDraftTagIds: filterModel.commands.resetDraftTagIds,
            applyDraftTagIds: filterModel.commands.applyDraftTagIds,
          },
        }}
      />
      <AnalyticsMoreFiltersSheetView
        required={{
          data: { accounts: filterModel.availableAccounts },
          state: {
            open: filterModel.moreFiltersSheetOpen,
            draftAccountIds: filterModel.draftAccountIds,
            draftIncludeIgnoredMovements: filterModel.draftIncludeIgnoredMovements,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            close: filterModel.commands.closeMoreFiltersSheet,
            setDraftAccountIds: filterModel.commands.setDraftAccountIds,
            setDraftIncludeIgnoredMovements: filterModel.commands.setDraftIncludeIgnoredMovements,
            resetMoreFiltersDraft: filterModel.commands.resetMoreFiltersDraft,
            applyMoreFiltersDraft: filterModel.commands.applyMoreFiltersDraft,
          },
        }}
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
        <SpendingTabComponent
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
        <FlowTabComponent
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
