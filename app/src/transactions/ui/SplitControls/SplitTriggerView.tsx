import type { ViewProps } from '../../../shared/ui/ViewProps';
import './SplitControlsView.css';

export type SplitTriggerViewProps = ViewProps<
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

export function SplitTriggerView({ required, provided }: SplitTriggerViewProps) {
  return (
    <button
      type="button"
      className="split-trigger"
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <i className="bi bi-receipt" aria-hidden />
      Split
    </button>
  );
}
