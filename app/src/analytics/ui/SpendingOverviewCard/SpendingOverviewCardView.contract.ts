import type { LedgerCashFlowGranularity } from '../../../ledger/application/ledger.port';

export type SpendingOverviewCategoryView = {
  key: string;
  name: string;
  amount: string;
  percentage: number;
  color: string;
};

export type SpendingOverviewCardViewProps = {
  required: {
    data: {
      totalAmount: string;
      windowLabel: string;
      categories: SpendingOverviewCategoryView[];
    };
    state: {
      granularity: LedgerCashFlowGranularity;
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
