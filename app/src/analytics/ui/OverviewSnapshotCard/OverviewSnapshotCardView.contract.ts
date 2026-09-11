export type OverviewSnapshotCardViewProps = {
  required: {
    data: {
      currentWindowLabel: string;
      previousWindowLabel?: string;
      comparisonPercent?: string;
      incomeAmount: string;
      expenseAmount: string;
      netFlowAmount: string;
      incomeShare: number;
      expenseShare: number;
      netFlowTone: 'income' | 'expense' | 'neutral';
      comparisonTone: 'income' | 'expense' | 'neutral';
      comparisonDirection: 'up' | 'down' | 'flat';
    };
    status: {
      loading: boolean;
      disabled?: boolean;
      amountVisibility?: AmountVisibility;
    };
  };
  provided: {
    commands: Record<string, never>;
  };
};
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
