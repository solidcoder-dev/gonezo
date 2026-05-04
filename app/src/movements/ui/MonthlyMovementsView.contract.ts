import type { ExpectedMovementItem, SchedulingMovementItem } from '../../shared/domain/corePort';
import type { TransactionHistoryItemView } from '../../transactions/domain/transactionView.types';

export type MonthlyMovementsViewRequired = {
  state: {
    accountId: string;
    monthLabel: string;
    isCurrentMonth: boolean;
    monthMenuOpen: boolean;
    monthPickerOpen: boolean;
    monthPickerYear: number;
    viewedMonthIndex: number;
    viewedYear: number;
    currentMonthIndex: number;
    currentYear: number;
    items: TransactionHistoryItemView[];
    scheduledItems: SchedulingMovementItem[];
    scheduledTotal: number;
    scheduledHasMore: boolean;
    expectedItems: ExpectedMovementItem[];
    expectedTotal: number;
    expectedHasMore: boolean;
    filterOptions: {
      categories: Array<{ id: string; label: string }>;
      tags: Array<{ id: string; label: string }>;
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
    pendingPostExpectedId?: string;
  };
  status: {
    loading: boolean;
    disabled: boolean;
  };
};

export type MonthlyMovementsViewProvided = {
  commands: {
    goToPreviousMonth: () => void;
    goToCurrentMonth: () => void;
    goToNextMonth: () => void;
    toggleMonthMenu: () => void;
    closeMonthMenu: () => void;
    openMonthPicker: () => void;
    closeMonthPicker: () => void;
    goToPreviousPickerYear: () => void;
    goToNextPickerYear: () => void;
    selectPickerMonth: (monthIndex: number) => void;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    requestVoid: (transactionId: string) => void;
    deactivateScheduledMovement: (scheduledMovementId: string) => Promise<void>;
    postExpectedMovement: (movement: ExpectedMovementItem) => Promise<boolean>;
    editExpectedMovement: (movement: ExpectedMovementItem, categoryName?: string) => void;
  };
};

export type MonthlyMovementsViewProps = {
  required: MonthlyMovementsViewRequired;
  provided: MonthlyMovementsViewProvided;
};
