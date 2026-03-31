import type { TransactionHistoryItemView } from '../domain/transactionView.types';

export type TransactionHistoryStatusFilterValue = 'all' | 'draft' | 'posted' | 'voided';

export type TransactionHistoryFilterOption = {
  id: string;
  label: string;
};

export type TransactionHistoryViewRequired = {
  state: {
    items: TransactionHistoryItemView[];
    filtersOpen: boolean;
    filtersAdvancedOpen: boolean;
    filters: {
      text: string;
      categoryIds: string[];
      tagIds: string[];
      amountMin: string;
      amountMax: string;
      fromDate: string;
      toDate: string;
      status: TransactionHistoryStatusFilterValue;
      sortField: 'occurredAt' | 'amount';
      sortDirection: 'asc' | 'desc';
      pageSize: number;
    };
    filterOptions: {
      categories: TransactionHistoryFilterOption[];
      tags: TransactionHistoryFilterOption[];
    };
    pagination: {
      page: number;
      size: number;
      totalElements: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    pendingVoidTransactionId?: string;
  };
  status: {
    loading: boolean;
    mutating: boolean;
    disabled: boolean;
  };
};

export type TransactionHistoryViewProvided = {
  commands: {
    openFilters: () => void;
    closeFilters: () => void;
    toggleAdvancedFilters: () => void;
    resetFilters: () => void;
    setFilterText: (value: string) => void;
    setFilterCategoryIds: (values: string[]) => void;
    setFilterTagIds: (values: string[]) => void;
    setFilterAmountMin: (value: string) => void;
    setFilterAmountMax: (value: string) => void;
    setFilterFromDate: (value: string) => void;
    setFilterToDate: (value: string) => void;
    setFilterStatus: (value: TransactionHistoryStatusFilterValue) => void;
    setSortField: (value: 'occurredAt' | 'amount') => void;
    setSortDirection: (value: 'asc' | 'desc') => void;
    setPageSize: (value: number) => void;
    applyFilters: () => void;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    requestVoid: (transactionId: string) => void;
    undoVoid: () => void;
  };
};

export type TransactionHistoryViewProps = {
  required: TransactionHistoryViewRequired;
  provided: TransactionHistoryViewProvided;
};
