import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../../shared/domain/schedulingView.types';
import type { ViewProps } from '../../../shared/ui/ViewProps';

export type RecurrenceEditorViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    frequency: RecurrenceFrequency;
    interval: string;
    weeklyDay: string;
    monthlyPattern: RecurrenceMonthlyPattern;
    dayOfMonth: string;
    monthlyOrdinal: string;
    monthlyWeekday: string;
    endKind: RecurrenceEndInput['kind'];
    endDate: string;
    endCount: string;
  },
  {
    intervalError?: string;
    endDateError?: string;
    endCountError?: string;
  },
  {
    setFrequency: (value: RecurrenceFrequency) => void;
    setInterval: (value: string) => void;
    setWeeklyDay: (value: string) => void;
    setMonthlyPattern: (value: RecurrenceMonthlyPattern) => void;
    setDayOfMonth: (value: string) => void;
    setMonthlyOrdinal: (value: string) => void;
    setMonthlyWeekday: (value: string) => void;
    setEndKind: (value: RecurrenceEndInput['kind']) => void;
    setEndDate: (value: string) => void;
    setEndCount: (value: string) => void;
  }
>;

export function RecurrenceEditorView({ required, provided }: RecurrenceEditorViewProps) {
  const { state, status } = required;

  return (
    <div className="stack item-editor composer-recurring-panel">
      <div className="composer-recurring-row">
        <span>Frequency</span>
        <select
          aria-label="Recurrence frequency"
          value={state.frequency}
          onChange={(event) => provided.commands.setFrequency(event.target.value as RecurrenceFrequency)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      <div className="composer-recurring-row">
        <span>Every</span>
        <input
          aria-label="Recurrence interval"
          type="number"
          min="1"
          step="1"
          value={state.interval}
          onChange={(event) => provided.commands.setInterval(event.target.value)}
          aria-invalid={Boolean(status.intervalError)}
          aria-describedby={status.intervalError ? 'composer-recurrence-interval-error' : undefined}
        />
      </div>
      {status.intervalError ? (
        <p id="composer-recurrence-interval-error" className="field-error">{status.intervalError}</p>
      ) : null}

      {state.frequency === 'weekly' ? (
        <div className="composer-recurring-row">
          <span>Weekly rule</span>
          <select
            aria-label="Recurrence weekday"
            value={state.weeklyDay}
            onChange={(event) => provided.commands.setWeeklyDay(event.target.value)}
          >
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
            <option value="7">Sunday</option>
          </select>
        </div>
      ) : null}

      {state.frequency === 'monthly' ? (
        <>
          <div className="composer-recurring-row">
            <span>Monthly rule</span>
            <select
              aria-label="Monthly recurrence rule"
              value={state.monthlyPattern}
              onChange={(event) => provided.commands.setMonthlyPattern(event.target.value as RecurrenceMonthlyPattern)}
            >
              <option value="day_of_month">Day of month</option>
              <option value="nth_weekday">Nth weekday</option>
            </select>
          </div>

          {state.monthlyPattern === 'day_of_month' ? (
            <div className="composer-recurring-row">
              <span>Day of month</span>
              <input
                aria-label="Monthly day of month"
                type="number"
                min="1"
                max="31"
                step="1"
                value={state.dayOfMonth}
                onChange={(event) => provided.commands.setDayOfMonth(event.target.value)}
              />
            </div>
          ) : (
            <div className="quick-row">
              <div className="composer-recurring-row">
                <span>Ordinal</span>
                <select
                  aria-label="Monthly ordinal"
                  value={state.monthlyOrdinal}
                  onChange={(event) => provided.commands.setMonthlyOrdinal(event.target.value)}
                >
                  <option value="1">1st</option>
                  <option value="2">2nd</option>
                  <option value="3">3rd</option>
                  <option value="4">4th</option>
                  <option value="5">Last-ish</option>
                </select>
              </div>
              <div className="composer-recurring-row">
                <span>Weekday</span>
                <select
                  aria-label="Monthly weekday"
                  value={state.monthlyWeekday}
                  onChange={(event) => provided.commands.setMonthlyWeekday(event.target.value)}
                >
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="7">Sunday</option>
                </select>
              </div>
            </div>
          )}
        </>
      ) : null}

      <div className="composer-recurring-row">
        <span>Ends</span>
        <select
          aria-label="Recurrence end"
          value={state.endKind}
          onChange={(event) => provided.commands.setEndKind(event.target.value as RecurrenceEndInput['kind'])}
        >
          <option value="never">Never</option>
          <option value="on_date">On date</option>
          <option value="after_occurrences">After count</option>
        </select>
      </div>

      {state.endKind === 'on_date' ? (
        <>
          <div className="composer-recurring-row">
            <span>End date</span>
            <input
              aria-label="Recurrence end date"
              type="date"
              value={state.endDate}
              onChange={(event) => provided.commands.setEndDate(event.target.value)}
              aria-invalid={Boolean(status.endDateError)}
              aria-describedby={status.endDateError ? 'composer-recurrence-end-date-error' : undefined}
            />
          </div>
          {status.endDateError ? (
            <p id="composer-recurrence-end-date-error" className="field-error">{status.endDateError}</p>
          ) : null}
        </>
      ) : null}

      {state.endKind === 'after_occurrences' ? (
        <>
          <div className="composer-recurring-row">
            <span>Count</span>
            <input
              aria-label="Recurrence end count"
              type="number"
              min="1"
              step="1"
              value={state.endCount}
              onChange={(event) => provided.commands.setEndCount(event.target.value)}
              aria-invalid={Boolean(status.endCountError)}
              aria-describedby={status.endCountError ? 'composer-recurrence-end-count-error' : undefined}
            />
          </div>
          {status.endCountError ? (
            <p id="composer-recurrence-end-count-error" className="field-error">{status.endCountError}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
