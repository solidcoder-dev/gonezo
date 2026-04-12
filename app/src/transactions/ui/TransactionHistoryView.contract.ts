import type { TransactionHistoryItemView } from '../domain/transactionView.types';
import type { SchedulingMovementItem } from '../../shared/domain/corePort';

export type TransactionHistoryStatusFilterValue = 'all' | 'scheduled' | 'executed' | 'voided' | 'failed';
export type TransactionHistoryOriginFilterValue = 'all' | 'recurring' | 'one_shot' | 'manual';

export type TransactionHistoryFilterOption = {
  id: string;
  label: string;
};

export type TransactionHistoryFiltersState = {
  text: string;
  categoryIds: string[];
  tagIds: string[];
  amountMin: string;
  amountMax: string;
  fromDate: string;
  toDate: string;
  status: TransactionHistoryStatusFilterValue;
  origin: TransactionHistoryOriginFilterValue;
  sortField: 'occurredAt' | 'amount';
  sortDirection: 'asc' | 'desc';
  pageSize: number;
};

export type TransactionHistoryViewRequired = {
  state: {
    items: TransactionHistoryItemView[];
    scheduledItems: SchedulingMovementItem[];
    scheduledTotal: number;
    scheduledHasMore: boolean;
    filtersOpen: boolean;
    filtersAdvancedOpen: boolean;
    filters: TransactionHistoryFiltersState;
    appliedFilters: TransactionHistoryFiltersState;
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
    pendingDeactivateScheduledId?: string;
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
    setFilterOrigin: (value: TransactionHistoryOriginFilterValue) => void;
    setSortField: (value: 'occurredAt' | 'amount') => void;
    setSortDirection: (value: 'asc' | 'desc') => void;
    setPageSize: (value: number) => void;
    applyFilterPatch: (patch: Partial<TransactionHistoryFiltersState>) => void;
    applyFilters: () => void;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    requestVoid: (transactionId: string) => void;
    deactivateScheduledMovement: (scheduledMovementId: string) => Promise<void>;
    undoVoid: () => void;
  };
};

export type TransactionHistoryViewProps = {
  required: TransactionHistoryViewRequired;
  provided: TransactionHistoryViewProvided;
};
