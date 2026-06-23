import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ScheduleControlsView.css';

export type ScheduleTriggerViewProps = ViewProps<
  {
    label?: string;
  },
  Record<string, never>,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    open: () => void;
  }
>;

export function ScheduleTriggerView({ required, provided }: ScheduleTriggerViewProps) {
  const label = required.config.label ?? 'Schedule recurring';

  return (
    <button
      type="button"
      className="schedule-trigger"
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <i className="bi bi-arrow-repeat" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
