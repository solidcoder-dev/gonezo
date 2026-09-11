import type { AnalyticsPort } from './analytics.port';
import {
  AnalyticsFilterBarView,
} from '../ui/AnalyticsFilterBarView';
import { AnalyticsCurrencySheetView } from '../ui/AnalyticsCurrencySheetView';
import { AnalyticsMoreFiltersSheetView } from '../ui/AnalyticsMoreFiltersSheetView';
import { AnalyticsPeriodSheetView } from '../ui/AnalyticsPeriodSheetView';
import { AnalyticsDashboardComponent } from './AnalyticsDashboardComponent';
import { useAnalyticsFiltersModel } from './useAnalyticsFiltersModel';
import styles from '../ui/AnalyticsPageView.module.css';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import { useEffect } from 'react';
import type { AnalyticsFilters, AnalyticsFiltersInput } from './analyticsFilters';
import type { AnalyticsHighlightViewModel } from '../ui/AnalyticsHighlights/AnalyticsHighlightsView.contract';
import { useAnalyticsPeriodNavigation } from './useAnalyticsPeriodNavigation';
import type { AnalyticsPeriodSelection } from './analyticsPeriodSelection';

export type AnalyticsPageComponentProps = {
  required: {
    context: {
      core: AnalyticsPort;
    };
    config: {
      enabled: boolean;
      refreshSignal: boolean;
      amountVisibility?: AmountVisibility;
      initialFilters?: AnalyticsFiltersInput;
      initialPeriodShift?: number;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
      onCategorySelected?: (categoryId: string) => void;
      onMerchantSelected?: (merchant: string) => void;
      onHighlightSelected?: (item: AnalyticsHighlightViewModel) => void;
      onForecastSelected?: () => void;
      onIncomeSelected?: (window: { start: string; end: string }) => void;
      onExpensesSelected?: (window: { start: string; end: string }) => void;
      onSpendingPeriodSelected?: (bucket: { start: string; endExclusive: string }) => void;
      onContextChanged?: (filters: AnalyticsFilters) => void;
      onPeriodSelectionChanged?: (selection: AnalyticsPeriodSelection) => void;
    };
  };
};

export function AnalyticsPageComponent({ required, provided }: AnalyticsPageComponentProps) {
  const filterModel = useAnalyticsFiltersModel({
    core: required.context.core,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    initialFilters: required.config.initialFilters,
    onError: provided?.events?.onError,
  });
  const currency = filterModel.filters.currency;
  const periodNavigation = useAnalyticsPeriodNavigation(filterModel.filters.period, required.config.initialPeriodShift, filterModel.filters.includePlannedMovements);
  const moreFiltersCount = Number(filterModel.filters.accountIds.length > 0)
    + Number(filterModel.filters.tagIds.length > 0)
    + Number(filterModel.filters.includeIgnoredMovements)
    + Number(!filterModel.filters.includePlannedMovements)
    + Number(filterModel.filters.sharedAmountMode === 'full');

  useEffect(() => {
    if (!filterModel.loading && filterModel.filters.currency) {
      provided?.events?.onContextChanged?.(filterModel.filters);
    }
  }, [filterModel.filters, filterModel.loading, provided?.events]);

  useEffect(() => {
    if (!filterModel.loading) {
      provided?.events?.onPeriodSelectionChanged?.(periodNavigation.periodSelection);
    }
  }, [filterModel.loading, periodNavigation.periodSelection, provided?.events]);

  return (
    <section className={styles.page}>
      <div className={styles.navigation}>
        <AnalyticsFilterBarView
          required={{
            state: {
              currency: filterModel.filters.currency,
              period: filterModel.filters.period,
              moreFiltersCount,
            },
            status: {
              disabled: filterModel.disabled || filterModel.loading,
            },
          }}
          provided={{
            commands: {
              openCurrencySheet: filterModel.commands.openCurrencySheet,
              openPeriodSheet: filterModel.commands.openPeriodSheet,
              openMoreFiltersSheet: filterModel.commands.openMoreFiltersSheet,
            },
          }}
        />
      </div>
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
            draftCustomFrom: filterModel.draftCustomFrom,
            draftCustomTo: filterModel.draftCustomTo,
            draftPeriodError: filterModel.draftPeriodError,
          },
          status: {
            disabled: filterModel.disabled || filterModel.loading,
          },
        }}
        provided={{
          commands: {
            close: filterModel.commands.closePeriodSheet,
            setDraftPeriod: filterModel.commands.setDraftPeriod,
            setDraftCustomFrom: filterModel.commands.setDraftCustomFrom,
            setDraftCustomTo: filterModel.commands.setDraftCustomTo,
            applyDraftPeriod: filterModel.commands.applyDraftPeriod,
          },
        }}
      />
      <AnalyticsMoreFiltersSheetView
        required={{
          data: { accounts: filterModel.availableAccounts, tags: filterModel.availableTags },
          state: {
            open: filterModel.moreFiltersSheetOpen,
            draftAccountIds: filterModel.draftAccountIds,
            draftIncludeIgnoredMovements: filterModel.draftIncludeIgnoredMovements,
            draftIncludePlannedMovements: filterModel.draftIncludePlannedMovements,
            draftSharedAmountMode: filterModel.draftSharedAmountMode,
            draftTagIds: filterModel.draftTagIds,
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
            setDraftIncludePlannedMovements: filterModel.commands.setDraftIncludePlannedMovements,
            setDraftSharedAmountMode: filterModel.commands.setDraftSharedAmountMode,
            toggleDraftTagId: filterModel.commands.toggleDraftTagId,
            resetMoreFiltersDraft: filterModel.commands.resetMoreFiltersDraft,
            applyMoreFiltersDraft: filterModel.commands.applyMoreFiltersDraft,
          },
        }}
      />

      <AnalyticsDashboardComponent
        required={{
          context: { core: required.context.core },
          config: {
            enabled: required.config.enabled,
            currency,
            filters: filterModel.filters,
            periodSelection: periodNavigation.periodSelection,
            periodNavigation,
            refreshSignal: required.config.refreshSignal,
            amountVisibility: required.config.amountVisibility,
          },
        }}
        provided={provided}
      />
    </section>
  );
}
