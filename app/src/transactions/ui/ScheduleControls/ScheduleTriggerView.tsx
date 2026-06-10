import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ScheduleControlsView.css';

export type ScheduleTriggerViewProps = ViewProps<
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

export function ScheduleTriggerView({ required, provided }: ScheduleTriggerViewProps) {
  return (
    <button
      type="button"
      className="schedule-trigger"
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <i className="bi bi-arrow-repeat" aria-hidden />
      <span>Schedule recurring</span>
    </button>
  );
}
