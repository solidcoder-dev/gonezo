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
      <div className="split-summary-heading">Split</div>
      <div className="split-summary-card">
        <button
          type="button"
          className="split-summary-main"
          onClick={provided.commands.edit}
          disabled={status.disabled}
        >
          <span className="split-summary-line">
            <i className="bi bi-shuffle" aria-hidden />
            <span>{state.itemsCount} {itemLabel} · {formatCurrencyAmount(state.total, state.currencyCode)}</span>
          </span>
        </button>
        <div className="split-summary-actions">
          <button
            type="button"
            className="icon-button text-button split-summary-action"
            aria-label="Edit split"
            onClick={provided.commands.edit}
            disabled={status.disabled}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="icon-button text-button split-summary-action"
            aria-label="Remove split"
            onClick={provided.commands.remove}
            disabled={status.disabled}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
