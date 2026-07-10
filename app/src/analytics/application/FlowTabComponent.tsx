import type { AnalyticsPort } from './analytics.port';
import type { AnalyticsFiltersInput } from './analyticsFilters';
import { FlowProjectionCardComponent } from './FlowProjectionCardComponent';
import { FlowUpcomingCardsComponent } from './FlowUpcomingCardsComponent';
import { FlowInsightsRailComponent } from './FlowInsightsRailComponent';
import styles from '../ui/AnalyticsPageView.module.css';

export type FlowTabComponentProps = {
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

export function FlowTabComponent({ required, provided }: FlowTabComponentProps) {
  return (
    <div className={styles.stack}>
      <FlowProjectionCardComponent required={required} provided={provided} />
      <FlowUpcomingCardsComponent required={required} provided={provided} />
      <FlowInsightsRailComponent required={required} provided={provided} />
    </div>
  );
}
