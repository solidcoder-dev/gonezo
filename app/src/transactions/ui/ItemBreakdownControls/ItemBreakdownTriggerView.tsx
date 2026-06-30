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
      Items
    </button>
  );
}
