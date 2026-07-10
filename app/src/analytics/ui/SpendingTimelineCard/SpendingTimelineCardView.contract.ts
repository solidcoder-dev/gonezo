export type SpendingTimelinePointView = {
  key: string;
  label: string;
  amount: string;
  heightPercent: number;
};

export type SpendingTimelineCardViewProps = {
  required: {
    data: {
      windowLabel: string;
      points: SpendingTimelinePointView[];
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
