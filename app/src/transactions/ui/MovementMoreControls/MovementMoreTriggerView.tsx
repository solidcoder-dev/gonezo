import type { ViewProps } from '../../../shared/ui/ViewProps';
import './MovementMoreControlsView.css';

export type MovementMoreTriggerViewProps = ViewProps<
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

export function MovementMoreTriggerView({ required, provided }: MovementMoreTriggerViewProps) {
  return (
    <button
      type="button"
      className="movement-more-trigger"
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <i className="bi bi-sliders" aria-hidden />
      <span className="movement-more-trigger-text">
        <strong>More</strong>
        <small>Advanced actions</small>
      </span>
      <i className="bi bi-chevron-right movement-more-trigger-chevron" aria-hidden />
    </button>
  );
}
