import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ItemBreakdownControlsView.css';

export type ItemBreakdownTriggerViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    open: () => void;
  }
>;

export function ItemBreakdownTriggerView({ required, provided }: ItemBreakdownTriggerViewProps) {
  return (
    <button
      type="button"
      className="item-breakdown-trigger"
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <i className="bi bi-receipt" aria-hidden />
      <span className="item-breakdown-control-text">
        <strong>Items</strong>
      </span>
      <i className="bi bi-chevron-right item-breakdown-control-chevron" aria-hidden />
    </button>
  );
}
