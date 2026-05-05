import type { RecurrenceEndView, RecurrenceRuleView } from '../../shared/domain/schedulingView.types';

export type LedgerTransactionTypeView = 'income' | 'expense' | 'transfer' | 'transfer_out' | 'transfer_in';

export type LedgerSortDirectionView = 'asc' | 'desc';

export type MovementsSearchSourceView = 'posted' | 'scheduled' | 'expected';

export type MovementsSearchSortFieldView = 'date' | 'amount';

export type ScheduledMovementView = {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  sourceAccountId: string;
  targetAccountId?: string;
  amount: string;
  currency: string;
  destinationAmount?: string;
  destinationCurrency?: string;
  exchangeRate?: string;
  description?: string;
  merchant?: string;
  status: 'active' | 'deactivated' | 'completed';
  startAt: string;
  nextDueAt?: string;
  zoneId: string;
  generatedOccurrences: number;
  rule: RecurrenceRuleView;
  recurrenceEnd: RecurrenceEndView;
  categoryId?: string;
  tagIds?: string[];
  tagNames?: string[];
  scheduleKind?: 'recurring' | 'one_shot';
  origin?: 'recurring' | 'one_shot';
};

export type ExpectedMovementView = {
  id: string;
  accountId: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  expectedAt: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  originOccurrenceId?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
};

export type MovementsSearchItemView = {
  id: string;
  source: MovementsSearchSourceView;
  type: LedgerTransactionTypeView;
  status: 'posted' | 'scheduled' | 'expected' | 'resolved' | 'dismissed' | 'voided' | 'failed' | 'deactivated';
  amount: string;
  currency: string;
  occurredAt: string;
  title: string;
  description?: string;
  merchant?: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  tags?: Array<{
    id: string;
    name: string;
  }>;
};

export type MovementsSearchFiltersState = {
  source: MovementsSearchSourceView;
  text: string;
  merchant: string;
  categoryIds: string[];
  tagIds: string[];
  amountMin: string;
  amountMax: string;
  fromDate: string;
  toDate: string;
  types: LedgerTransactionTypeView[];
  sortField: MovementsSearchSortFieldView;
  sortDirection: LedgerSortDirectionView;
  pageSize: number;
  groupByDay: boolean;
};

export type MovementsPaginationView = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type MovementsFilterOptionsView = {
  categories: Array<{ id: string; label: string }>;
  tags: Array<{ id: string; label: string }>;
};

export type MovementsSearchModelRequired = {
  error: string;
  state: {
    source: MovementsSearchSourceView;
    items: MovementsSearchItemView[];
    filtersOpen: boolean;
    filtersAdvancedOpen: boolean;
    searchApplied: boolean;
    filters: MovementsSearchFiltersState;
    appliedFilters: MovementsSearchFiltersState;
    filterOptions: MovementsFilterOptionsView;
    pagination: MovementsPaginationView;
  };
  status: {
    loading: boolean;
    disabled: boolean;
  };
};

export type MovementsSearchModelProvided = {
  commands: {
    setSource: (value: MovementsSearchSourceView) => void;
    openFilters: () => void;
    closeFilters: () => void;
    toggleAdvancedFilters: () => void;
    resetFilters: () => void;
    setFilterText: (value: string) => void;
    setFilterMerchant: (value: string) => void;
    setFilterCategoryIds: (values: string[]) => void;
    setFilterTagIds: (values: string[]) => void;
    setFilterAmountMin: (value: string) => void;
    setFilterAmountMax: (value: string) => void;
    setFilterFromDate: (value: string) => void;
    setFilterToDate: (value: string) => void;
    setFilterTypes: (values: LedgerTransactionTypeView[]) => void;
    setSortField: (value: MovementsSearchSortFieldView) => void;
    setSortDirection: (value: LedgerSortDirectionView) => void;
    setPageSize: (value: number) => void;
    setGroupByDay: (value: boolean) => void;
    applyFilterPatch: (patch: Partial<MovementsSearchFiltersState>) => void;
    applyFilters: () => void;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
  };
};
