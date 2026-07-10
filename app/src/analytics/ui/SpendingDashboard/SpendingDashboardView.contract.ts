export type SpendingDashboardCategoryView = {
  key: string;
  name: string;
  amount: string;
  percentage: number;
  color: string;
};

export type SpendingDashboardViewProps = {
  required: {
    data: {
      totalAmount: string;
      comparisonAmount?: string;
      currentWindowLabel: string;
      previousWindowLabel?: string;
      visibleCategories: SpendingDashboardCategoryView[];
      allCategories: SpendingDashboardCategoryView[];
    };
    state: {
      breakdownOpen: boolean;
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: {
      openBreakdown: () => void;
      closeBreakdown: () => void;
    };
  };
};
