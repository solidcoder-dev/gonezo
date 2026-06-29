import type { ViewProps } from '../../../shared/ui/ViewProps';
import './SplitControlsView.css';

export type SplitSummaryViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    itemsCount: number;
    total: string;
    currencyCode?: string;
  },
  {
    disabled?: boolean;
  },
  {
    edit: () => void;
    remove: () => void;
  }
>;

function formatCurrencyAmount(amount: string, currencyCode?: string): string {
  return currencyCode ? `${amount} ${currencyCode}` : amount;
}

export function SplitSummaryView({ required, provided }: SplitSummaryViewProps) {
  const { state, status } = required;
  const itemLabel = state.itemsCount === 1 ? 'item' : 'items';

  return (
    <section className="split-summary" aria-label="Split">
      <button
        type="button"
        className="split-summary-chip"
        onClick={provided.commands.edit}
        disabled={status.disabled}
        aria-label={`Edit split, ${state.itemsCount} ${itemLabel}, ${formatCurrencyAmount(state.total, state.currencyCode)}`}
      >
        <i className="bi bi-receipt" aria-hidden />
        <span>{state.itemsCount} {itemLabel}</span>
      </button>
    </section>
  );
}
