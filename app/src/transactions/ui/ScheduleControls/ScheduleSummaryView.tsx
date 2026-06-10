import type { ViewProps } from '../../../shared/ui/ViewProps';
import './ScheduleControlsView.css';

export type ScheduleSummaryViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    summary: string;
    nextDate: string;
  },
  {
    disabled?: boolean;
  },
  {
    edit: () => void;
    remove: () => void;
  }
>;

export function ScheduleSummaryView({ required, provided }: ScheduleSummaryViewProps) {
  const { state, status } = required;

  return (
    <section className="schedule-summary" aria-label="Schedule">
      <div className="schedule-summary-heading">Schedule</div>
      <div className="schedule-summary-card">
        <button
          type="button"
          className="schedule-summary-main"
          onClick={provided.commands.edit}
          disabled={status.disabled}
        >
          <span className="schedule-summary-line">
            <i className="bi bi-arrow-repeat" aria-hidden />
            <span>{state.summary}</span>
          </span>
          <span className="schedule-summary-next">Next: {state.nextDate}</span>
        </button>
        <div className="schedule-summary-actions">
          <button
            type="button"
            className="icon-button text-button schedule-summary-action"
            aria-label="Edit schedule"
            onClick={provided.commands.edit}
            disabled={status.disabled}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="icon-button text-button schedule-summary-action"
            aria-label="Remove schedule"
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
