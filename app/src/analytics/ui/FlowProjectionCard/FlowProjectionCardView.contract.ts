export type FlowProjectionChartPointView = {
  key: string;
  label: string;
  postedBalanceAmount?: number;
  scheduledBalanceAmount?: number;
  expectedBalanceAmount: number;
};

export type FlowProjectionCardViewProps = {
  required: {
    data: {
      windowLabel: string;
      currentMarkerLabel: string;
      currentBalanceAmount: string;
      expectedEndBalanceAmount: string;
      lowestPointAmount: string;
      lowestPointLabel: string;
      points: FlowProjectionChartPointView[];
    };
    state: {
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
      goToPreviousWindow: () => void;
      goToNextWindow: () => void;
    };
  };
};
