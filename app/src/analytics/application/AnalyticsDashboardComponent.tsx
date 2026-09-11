import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { FlowTabComponent } from './FlowTabComponent';
import { OverviewTabComponent } from './OverviewTabComponent';
import { SpendingTabComponent } from './SpendingTabComponent';
import styles from '../ui/AnalyticsPageView.module.css';

export type AnalyticsDashboardComponentProps = {
  required: {
    context: { core: AnalyticsPort };
    config: {
      enabled: boolean;
      currency: string;
      filters?: AnalyticsFiltersInput;
      refreshSignal: boolean;
      amountVisibility?: AmountVisibility;
    };
  };
  provided?: { events?: { onError?: (error: { message: string }) => void } };
};

export function AnalyticsDashboardComponent({ required, provided }: AnalyticsDashboardComponentProps) {
  const { core } = required.context;
  const { config } = required;
  const childConfig = {
    enabled: config.enabled,
    currency: config.currency,
    filters: config.filters,
    refreshSignal: config.refreshSignal,
    amountVisibility: config.amountVisibility,
  };

  return (
    <div className={`${styles.analyticsOverviewContent} ${styles.dashboard}`} data-testid="analytics-dashboard">
      <OverviewTabComponent required={{ context: { core }, config: childConfig }} provided={provided} />
      <SpendingTabComponent required={{ context: { core }, config: childConfig }} provided={provided} />
      <FlowTabComponent required={{ context: { core }, config: childConfig }} provided={provided} />
    </div>
  );
}
