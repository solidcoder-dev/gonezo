import type { SpendingReportViewModel, TopExpensesViewModel } from '../../application/spendingPresenters';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';

export type SpendingTabViewProps = {
  required: { report?: SpendingReportViewModel; topExpenses?: TopExpensesViewModel; topExpensesSearchHref?: string; status: { reportLoading: boolean; topLoading: boolean; reportError?: string; topError?: string; amountVisibility?: AmountVisibility } };
  provided: { commands: { previous: () => void; next: () => void; openCategories: () => void; closeSheet: () => void }; state: { canPrevious: boolean; canNext: boolean; sheetOpen: 'categories' | null } };
};
