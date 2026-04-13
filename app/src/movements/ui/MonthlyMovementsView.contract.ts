import type { SchedulingMovementItem } from '../../shared/domain/corePort';
import type { TransactionHistoryItemView } from '../../transactions/domain/transactionView.types';

export type MonthlyMovementsViewRequired = {
  state: {
    accountId: string;
    monthLabel: string;
    isCurrentMonth: boolean;
    items: TransactionHistoryItemView[];
    scheduledItems: SchedulingMovementItem[];
    scheduledTotal: number;
    scheduledHasMore: boolean;
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
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    requestVoid: (transactionId: string) => void;
    deactivateScheduledMovement: (scheduledMovementId: string) => Promise<void>;
  };
};

export type MonthlyMovementsViewProps = {
  required: MonthlyMovementsViewRequired;
  provided: MonthlyMovementsViewProvided;
};
