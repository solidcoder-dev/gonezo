import { RecentTransactionsListView } from './RecentTransactionsListView';
import type { TransactionHistoryViewProps } from './TransactionHistoryView.contract';

export type {
  TransactionHistoryViewProps,
  TransactionHistoryViewProvided,
  TransactionHistoryViewRequired,
} from './TransactionHistoryView.contract';

export function TransactionHistoryView({ required, provided }: TransactionHistoryViewProps) {
  return (
    <RecentTransactionsListView
      required={{
        items: required.state.items,
        scheduledItems: required.state.scheduledItems,
        scheduledTotal: required.state.scheduledTotal,
        scheduledHasMore: required.state.scheduledHasMore,
        filtersOpen: required.state.filtersOpen,
        filtersAdvancedOpen: required.state.filtersAdvancedOpen,
        filters: required.state.filters,
        filterOptions: required.state.filterOptions,
        pagination: required.state.pagination,
        loading: required.status.loading,
        disabled: required.status.disabled,
        pendingVoidTransactionId: required.state.pendingVoidTransactionId,
        pendingDeactivateScheduledId: required.state.pendingDeactivateScheduledId,
      }}
      provided={{
        onOpenFilters: provided.commands.openFilters,
        onCloseFilters: provided.commands.closeFilters,
        onToggleAdvancedFilters: provided.commands.toggleAdvancedFilters,
        onResetFilters: provided.commands.resetFilters,
        onFilterTextChange: provided.commands.setFilterText,
        onFilterCategoryIdsChange: provided.commands.setFilterCategoryIds,
        onFilterTagIdsChange: provided.commands.setFilterTagIds,
        onFilterAmountMinChange: provided.commands.setFilterAmountMin,
        onFilterAmountMaxChange: provided.commands.setFilterAmountMax,
        onFilterFromDateChange: provided.commands.setFilterFromDate,
        onFilterToDateChange: provided.commands.setFilterToDate,
        onFilterStatusChange: provided.commands.setFilterStatus,
        onFilterOriginChange: provided.commands.setFilterOrigin,
        onSortFieldChange: provided.commands.setSortField,
        onSortDirectionChange: provided.commands.setSortDirection,
        onPageSizeChange: provided.commands.setPageSize,
        onApplyFilters: provided.commands.applyFilters,
        onPreviousPage: provided.commands.goToPreviousPage,
        onNextPage: provided.commands.goToNextPage,
        onVoid: provided.commands.requestVoid,
        onDeactivateScheduled: provided.commands.deactivateScheduledMovement,
      }}
    />
  );
}
