export type TaxonomyAssignmentStatusView = 'none' | 'pending' | 'processing' | 'assigned' | 'failed';

export type TransactionCategoryView = {
  id: string;
  name: string;
};

export type TransactionTagView = {
  id: string;
  name: string;
};

export type TransactionHistoryItemStatusView = 'draft' | 'posted' | 'voided' | 'archived';

export type TransactionHistoryItemTypeView =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'transfer_in'
  | 'transfer_out';

export type TransactionHistoryItemView = {
  id: string;
  accountId: string;
  accountName?: string;
  occurredAt: string;
  description?: string;
  merchant?: string;
  amount: string;
  currency: string;
  type: TransactionHistoryItemTypeView;
  status: TransactionHistoryItemStatusView;
  categoryId?: string;
  category?: TransactionCategoryView;
  tags?: TransactionTagView[];
  categorizationStatus?: TaxonomyAssignmentStatusView;
  taggingStatus?: TaxonomyAssignmentStatusView;
  items: Array<{
    id: string;
    name: string;
    amount: string;
  }>;
};
