export type LedgerCurrencyCode = string;

export type LedgerAccountStatus = 'active' | 'archived';

export type LedgerAccountView = {
  id: string;
  name: string;
  type: string;
  currency: LedgerCurrencyCode;
  status: LedgerAccountStatus;
};

export type LedgerTransactionType = 'income' | 'expense' | 'transfer_in' | 'transfer_out';

export type LedgerTransactionStatus = 'draft' | 'posted' | 'voided';

export type LedgerTransactionView = {
  id: string;
  accountId: string;
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  amount: string;
  currency: LedgerCurrencyCode;
  occurredAt: string;
  description?: string;
  merchant?: string;
};
