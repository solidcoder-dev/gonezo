export type AccountStatusView = 'active' | 'archived' | 'deleted';

export type AccountSummaryView = {
  id: string;
  name: string;
  type: string;
  currency: string;
  status: AccountStatusView;
};
