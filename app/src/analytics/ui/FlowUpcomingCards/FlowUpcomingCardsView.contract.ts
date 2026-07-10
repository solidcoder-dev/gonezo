export type FlowUpcomingItemView = {
  movementId: string;
  title: string;
  amount: string;
  occurredAt: string;
};

export type FlowUpcomingCardsViewProps = {
  required: {
    data: {
      incomingTotalAmount: string;
      outgoingTotalAmount: string;
      incoming: FlowUpcomingItemView[];
      outgoing: FlowUpcomingItemView[];
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
