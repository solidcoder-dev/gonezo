import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { SpendingDashboardComponent } from './SpendingDashboardComponent';
import { SpendingTimelineCardComponent } from './SpendingTimelineCardComponent';
import { SpendingTopExpensesCardComponent } from './SpendingTopExpensesCardComponent';
import styles from '../ui/AnalyticsPageView.module.css';

export type SpendingTabComponentProps = {
  required: {
    context: {
      core: AnalyticsPort;
    };
    config: {
      enabled: boolean;
      currency: string;
      filters?: AnalyticsFiltersInput;
      refreshSignal: boolean;
    };
  };
  provided?: {
    events?: {
      onError?: (error: { message: string }) => void;
    };
  };
};

export function SpendingTabComponent({ required, provided }: SpendingTabComponentProps) {
  return (
    <div className={styles.stack}>
      <SpendingDashboardComponent required={required} provided={provided} />
      <SpendingTimelineCardComponent required={required} provided={provided} />
      <SpendingTopExpensesCardComponent required={required} provided={provided} />
    </div>
  );
}
