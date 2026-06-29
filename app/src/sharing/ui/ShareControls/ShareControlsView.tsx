import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ShareControlsView.css';

export type ShareControlsViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    applied: boolean;
    peopleCount: number;
    total: string;
    currencyCode?: string;
  },
  {
    disabled?: boolean;
  },
  {
    open: () => void;
    remove: () => void;
  }
>;

function formatCurrencyAmount(amount: string, currencyCode?: string): string {
  return currencyCode ? `${amount} ${currencyCode}` : amount;
}

export function ShareControlsView({ required, provided }: ShareControlsViewProps) {
  const { state, status } = required;
  const peopleOwingCount = Math.max(0, state.peopleCount - 1);
  const shareLabel = peopleOwingCount === 1 ? '1 owes you' : `${peopleOwingCount} owe you`;

  if (!state.applied) {
    return (
      <button
        type="button"
        className="share-trigger"
        onClick={provided.commands.open}
        disabled={status.disabled}
      >
        <i className="bi bi-people" aria-hidden />
        Share
      </button>
    );
  }

  return (
    <section className="share-summary" aria-label="Share">
      <button
        type="button"
        className="share-summary-chip"
        onClick={provided.commands.open}
        disabled={status.disabled}
        aria-label={`Edit share, ${shareLabel}, ${formatCurrencyAmount(state.total, state.currencyCode)}`}
      >
        <i className="bi bi-people" aria-hidden />
        <span>{shareLabel}</span>
      </button>
    </section>
  );
}
