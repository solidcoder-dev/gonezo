import type { SpendingReportViewModel, TopExpensesViewModel } from '../../application/spendingPresenters';

export type SpendingTabViewProps = {
  required: { report?: SpendingReportViewModel; topExpenses?: TopExpensesViewModel; topExpensesSearchHref?: string; status: { reportLoading: boolean; topLoading: boolean; reportError?: string; topError?: string } };
  provided: { commands: { previous: () => void; next: () => void; openCategories: () => void; closeSheet: () => void }; state: { canPrevious: boolean; canNext: boolean; sheetOpen: 'categories' | null } };
};
