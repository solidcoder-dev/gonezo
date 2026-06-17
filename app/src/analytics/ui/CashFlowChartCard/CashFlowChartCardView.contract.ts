import type { LedgerCashFlowGranularity } from '../../../ledger/application/ledger.port';
import type { GroupedBarChartPointView } from '../../../shared/ui/Chart/GroupedBarChartView';

export type CashFlowChartCardViewProps = {
  required: {
    data: {
      currencies: string[];
      selectedCurrency: string;
      incomeTotalLabel: string;
      expenseTotalLabel: string;
      points: GroupedBarChartPointView[];
    };
    state: {
      granularity: LedgerCashFlowGranularity;
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      selectCurrency: (currency: string) => void;
      selectGranularity: (granularity: LedgerCashFlowGranularity) => void;
    };
  };
};
