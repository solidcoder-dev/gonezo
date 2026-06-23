import type { AnalyticsPort } from './analytics.port';
import { AnalyticsCurrencySelectorView } from '../ui/AnalyticsCurrencySelectorView';
import { CashFlowChartCardComponent } from './CashFlowChartCardComponent';
import { CashFlowSummaryCardsComponent } from './CashFlowSummaryCardsComponent';
import { SpendingOverviewCardComponent } from './SpendingOverviewCardComponent';
import { useAnalyticsCurrencyScope } from './useAnalyticsCurrencyScope';
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
  const currencyScope = useAnalyticsCurrencyScope({
    core: required.context.core,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    onError: provided?.events?.onError,
  });
  const currency = currencyScope.required.data.selectedCurrency;

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1>Analytics</h1>
        <AnalyticsCurrencySelectorView
          required={currencyScope.required}
          provided={currencyScope.provided}
        />
      </div>

      <div className={styles.stack}>
        <CashFlowSummaryCardsComponent
          required={{
            context: { core: required.context.core },
            config: {
              enabled: required.config.enabled,
              currency,
              refreshSignal: required.config.refreshSignal,
            },
          }}
          provided={provided}
        />
        <CashFlowChartCardComponent
          required={{
            context: { core: required.context.core },
            config: {
              enabled: required.config.enabled,
              currency,
              refreshSignal: required.config.refreshSignal,
            },
          }}
          provided={provided}
        />
        <SpendingOverviewCardComponent
          required={{
            context: { core: required.context.core },
            config: {
              enabled: required.config.enabled,
              currency,
              refreshSignal: required.config.refreshSignal,
            },
          }}
          provided={provided}
        />
      </div>
    </section>
  );
}
