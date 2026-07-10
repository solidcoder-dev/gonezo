export type FlowInsightsRailItemView = {
  key: string;
  title: string;
  subtitle: string;
  amount: string;
  tone: 'income' | 'expense' | 'neutral';
};

export type FlowInsightsRailViewProps = {
  required: {
    data: {
      items: FlowInsightsRailItemView[];
    };
    status: {
      loading: boolean;
      disabled?: boolean;
    };
  };
  provided: {
    commands: Record<string, never>;
  };
};
