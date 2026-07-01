import type { LedgerCashFlowGranularity } from '../../../ledger/application/ledger.port';
import type { GroupedBarChartPointView } from '../../../shared/ui/Chart/GroupedBarChartView';

export type CashFlowChartCardViewProps = {
  required: {
    data: {
      selectedCurrency: string;
      windowLabel: string;
      points: GroupedBarChartPointView[];
    };
    state: {
      granularity: LedgerCashFlowGranularity;
      canGoPreviousWindow: boolean;
      canGoNextWindow: boolean;
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      selectGranularity: (granularity: LedgerCashFlowGranularity) => void;
      goToPreviousWindow: () => void;
      goToNextWindow: () => void;
    };
  };
};
