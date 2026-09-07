import type { ViewProps } from '../../../shared/ui/ViewProps';

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
        className="w-100 d-flex align-items-center justify-content-between text-start border-0 bg-transparent p-0"
        onClick={provided.commands.edit}
        disabled={status.disabled}
        aria-label={`Edit items, ${state.itemsCount} ${itemLabel}, ${formatCurrencyAmount(state.total, state.currencyCode)}`}
      >
        <span className="d-flex flex-column gap-1 min-w-0">
          <strong>Items</strong>
          <small>{state.itemsCount} {itemLabel} · {formatCurrencyAmount(state.total, state.currencyCode)}</small>
        </span>
        <i className="bi bi-chevron-right text-secondary" aria-hidden />
      </button>
    </section>
  );
}
