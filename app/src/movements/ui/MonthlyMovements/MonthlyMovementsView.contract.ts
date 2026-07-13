import type { ExpectedMovementView, ScheduledMovementView } from '../../application/movementsView.types';
import type { TransactionHistoryItemView } from '../../../transactions/application/transactionView.types';
import type { MovementDetailViewProps } from '../MovementDetail/MovementDetailView';

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
    scheduledItems: ScheduledMovementView[];
    scheduledTotal: number;
    scheduledHasMore: boolean;
    expectedItems: ExpectedMovementView[];
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
    pendingDismissExpectedId?: string;
  };
  status: {
    loading: boolean;
    disabled: boolean;
  };
  detail: MovementDetailViewProps['required'];
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
    openPostedMovementDetail: (transactionId: string) => void;
    openScheduledMovementDetail: (scheduledMovementId: string) => void;
    openExpectedMovementDetail: (expectedMovementId: string) => void;
  };
  detail: MovementDetailViewProps['provided'];
};

export type MonthlyMovementsViewProps = {
  required: MonthlyMovementsViewRequired;
  provided: MonthlyMovementsViewProvided;
};
