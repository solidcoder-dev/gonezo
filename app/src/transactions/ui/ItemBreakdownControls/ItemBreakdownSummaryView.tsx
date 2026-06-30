import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ItemBreakdownControlsView.css';

export type ItemBreakdownSummaryViewProps = ViewProps<
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

export function ItemBreakdownSummaryView({ required, provided }: ItemBreakdownSummaryViewProps) {
  const { state, status } = required;
  const itemLabel = state.itemsCount === 1 ? 'item' : 'items';

  return (
    <section className="item-breakdown-summary" aria-label="Items">
      <button
        type="button"
        className="item-breakdown-summary-chip"
        onClick={provided.commands.edit}
        disabled={status.disabled}
        aria-label={`Edit items, ${state.itemsCount} ${itemLabel}, ${formatCurrencyAmount(state.total, state.currencyCode)}`}
      >
        <i className="bi bi-receipt" aria-hidden />
        <span>{state.itemsCount} {itemLabel} · {formatCurrencyAmount(state.total, state.currencyCode)}</span>
      </button>
    </section>
  );
}
