import { useRef, useState } from 'react';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../../shared/domain/schedulingView.types';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import './RecurrenceEditorView.css';

type ScheduleStep = 'summary' | 'repeat' | 'every' | 'on' | 'onDay' | 'ends';

type ScheduleOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
};

export type RecurrenceEditorViewProps = ViewProps<
  {
    title?: string;
  },
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
    nextOccurrenceDate: string;
  },
  {
    intervalError?: string;
    endDateError?: string;
    endCountError?: string;
  },
  {
    closeEditor: () => void;
    applySchedule: () => void;
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

const frequencyOptions: ScheduleOption<RecurrenceFrequency>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const weekdayOptions: ScheduleOption[] = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
];

const ordinalOptions: ScheduleOption[] = [
  { value: '1', label: 'First' },
  { value: '2', label: 'Second' },
  { value: '3', label: 'Third' },
  { value: '4', label: 'Fourth' },
  { value: '5', label: 'Last' },
];

const endOptions: ScheduleOption<RecurrenceEndInput['kind']>[] = [
  { value: 'never', label: 'Never' },
  { value: 'on_date', label: 'On date' },
  { value: 'after_occurrences', label: 'After', description: 'occurrences' },
];

function findLabel(options: ScheduleOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function intervalUnit(frequency: RecurrenceFrequency, interval: string): string {
  if (frequency === 'daily') return interval === '1' ? 'day' : 'days';
  if (frequency === 'weekly') return interval === '1' ? 'week' : 'weeks';
  if (frequency === 'yearly') return interval === '1' ? 'year' : 'years';
  return interval === '1' ? 'month' : 'months';
}

function intervalOptions(frequency: RecurrenceFrequency, currentValue: string): ScheduleOption[] {
  const baseValues = ['1', '2', '3', '6'];
  const values = baseValues.includes(currentValue) || currentValue.trim() === ''
    ? baseValues
    : [currentValue, ...baseValues];
  return values.map((value) => ({ value, label: `${value} ${intervalUnit(frequency, value)}` }));
}

function dayOfMonthOptions(): ScheduleOption[] {
  return Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1);
    return { value: day, label: day };
  });
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value || '-';
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: undefined }).format(date);
}

function repeatSummary(frequency: RecurrenceFrequency): string {
  return findLabel(frequencyOptions, frequency);
}

function everySummary(frequency: RecurrenceFrequency, interval: string): string {
  const value = interval.trim() || '1';
  return `${value} ${intervalUnit(frequency, value)}`;
}

function onSummary(state: RecurrenceEditorViewProps['required']['state']): string {
  if (state.frequency === 'daily') return '-';
  if (state.frequency === 'weekly') return findLabel(weekdayOptions, state.weeklyDay);
  if (state.frequency === 'yearly') return formatShortDate(state.nextOccurrenceDate);
  if (state.monthlyPattern === 'day_of_month') return `Day ${state.dayOfMonth || '1'}`;
  return `${findLabel(ordinalOptions, state.monthlyOrdinal)} ${findLabel(weekdayOptions, state.monthlyWeekday)}`;
}

function endsSummary(state: RecurrenceEditorViewProps['required']['state']): string {
  if (state.endKind === 'on_date') return state.endDate ? formatShortDate(state.endDate) : 'On date';
  if (state.endKind === 'after_occurrences') return `${state.endCount || '1'} occurrences`;
  return 'Never';
}

function OptionRadio<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: ScheduleOption<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      className={`composer-recurring-choice${selected ? ' composer-recurring-choice--selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(option.value)}
    >
      <span className="composer-recurring-radio" aria-hidden />
      <span className="composer-recurring-choice-text">
        <span>{option.label}</span>
        {option.description ? <small>{option.description}</small> : null}
      </span>
    </button>
  );
}

function SelectionHint({ children }: { children: string }) {
  return (
    <p className="composer-recurring-selection-hint">{children}</p>
  );
}

function ScheduleDateInput({
  value,
  label,
  error,
  errorId,
  onChange,
}: {
  value: string;
  label: string;
  error?: string;
  errorId: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <div className="composer-recurring-date-field">
        <input
          aria-label={label}
          type="text"
          value={value}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          onChange={(event) => onChange(formatDateInput(event.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <input
          ref={pickerRef}
          className="visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="text-button icon-button composer-recurring-date-button"
          aria-label="Open calendar"
          onClick={() => pickerRef.current?.showPicker?.()}
        >
          <i className="bi bi-calendar3" aria-hidden />
        </button>
      </div>
      {error ? <p id={errorId} className="field-error">{error}</p> : null}
    </>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="composer-recurring-summary-row"
      aria-label={`${label}: ${value}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="composer-recurring-icon">
        <i className={icon} aria-hidden />
      </span>
      <span className="composer-recurring-summary-label">{label}</span>
      <span className="composer-recurring-summary-value">{value}</span>
      <i className="bi bi-chevron-right composer-recurring-chevron" aria-hidden />
    </button>
  );
}

function EditorHeader({
  title,
  step,
  onBack,
  onClose,
}: {
  title: string;
  step: ScheduleStep;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="composer-recurring-header">
      {step === 'summary' ? (
        null
      ) : (
        <button type="button" className="text-button icon-button" aria-label="Back to schedule summary" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden />
        </button>
      )}
      <h3>{title}</h3>
      <button type="button" className="text-button icon-button" aria-label="Close schedule editor" onClick={onClose}>
        <i className="bi bi-x-lg" aria-hidden />
      </button>
    </div>
  );
}

export function RecurrenceEditorView({ required, provided }: RecurrenceEditorViewProps) {
  const { state, status } = required;
  const [step, setStep] = useState<ScheduleStep>('summary');
  const title = step === 'summary' ? required.config.title ?? 'Recurring schedule' : {
    repeat: 'Repeat',
    every: 'Every',
    on: 'On',
    onDay: 'On - Day',
    ends: 'Ends',
  }[step];

  function goSummary() {
    setStep('summary');
  }

  function selectFrequency(value: RecurrenceFrequency) {
    provided.commands.setFrequency(value);
    setStep('summary');
  }

  function selectInterval(value: string) {
    provided.commands.setInterval(value);
    setStep('summary');
  }

  function selectWeeklyDay(value: string) {
    provided.commands.setWeeklyDay(value);
    setStep('summary');
  }

  function selectEndKind(value: RecurrenceEndInput['kind']) {
    provided.commands.setEndKind(value);
    if (value === 'never') {
      setStep('summary');
    }
  }

  return (
    <div className="composer-recurring-panel">
      <EditorHeader
        title={title}
        step={step}
        onBack={goSummary}
        onClose={provided.commands.closeEditor}
      />

      {step === 'summary' ? (
        <>
          <p className="composer-recurring-next composer-recurring-next--success" aria-live="polite">
            <i className="bi bi-calendar4-week" aria-hidden />
            <span>Next occurrence: {formatShortDate(state.nextOccurrenceDate)}</span>
          </p>

          <div className="composer-recurring-summary-list">
            <SummaryRow icon="bi bi-list-ul" label="Repeat" value={repeatSummary(state.frequency)} onClick={() => setStep('repeat')} />
            <SummaryRow icon="bi bi-clock" label="Every" value={everySummary(state.frequency, state.interval)} onClick={() => setStep('every')} />
            <SummaryRow
              icon="bi bi-calendar4-week"
              label="On"
              value={onSummary(state)}
              onClick={() => setStep('on')}
              disabled={state.frequency === 'daily'}
            />
            <SummaryRow icon="bi bi-clock" label="Ends" value={endsSummary(state)} onClick={() => setStep('ends')} />
          </div>

          {status.intervalError ? <p id="composer-recurrence-interval-error" className="field-error">{status.intervalError}</p> : null}
          {status.endDateError ? <p id="composer-recurrence-end-date-error" className="field-error">{status.endDateError}</p> : null}
          {status.endCountError ? <p id="composer-recurrence-end-count-error" className="field-error">{status.endCountError}</p> : null}

          <button type="button" className="composer-recurring-primary-action" onClick={provided.commands.applySchedule}>
            Apply schedule
          </button>
        </>
      ) : null}

      {step === 'repeat' ? (
        <div className="composer-recurring-selection">
          {frequencyOptions.map((option) => (
            <OptionRadio
              key={option.value}
              option={option}
              selected={state.frequency === option.value}
              onSelect={selectFrequency}
            />
          ))}
          <SelectionHint>Selecting a value returns to the main modal immediately.</SelectionHint>
        </div>
      ) : null}

      {step === 'every' ? (
        <div className="composer-recurring-selection">
          {intervalOptions(state.frequency, state.interval).map((option) => (
            <OptionRadio
              key={option.value}
              option={option}
              selected={state.interval === option.value}
              onSelect={selectInterval}
            />
          ))}
          <SelectionHint>Selecting a value returns to the main modal immediately.</SelectionHint>
        </div>
      ) : null}

      {step === 'on' ? (
        <div className="composer-recurring-selection">
          {state.frequency === 'weekly' ? weekdayOptions.map((option) => (
            <OptionRadio key={option.value} option={option} selected={state.weeklyDay === option.value} onSelect={selectWeeklyDay} />
          )) : null}

          {state.frequency === 'monthly' ? (
            <>
              <SummaryRow
                icon="bi bi-calendar4-week"
                label="Day"
                value={`Day ${state.dayOfMonth || '1'}`}
                onClick={() => {
                  provided.commands.setMonthlyPattern('day_of_month');
                  setStep('onDay');
                }}
              />
              <SummaryRow
                icon="bi bi-calendar4-week"
                label="The nth weekday"
                value={`${findLabel(ordinalOptions, state.monthlyOrdinal)} ${findLabel(weekdayOptions, state.monthlyWeekday)}`}
                onClick={() => {
                  provided.commands.setMonthlyPattern('nth_weekday');
                  setStep('summary');
                }}
              />
            </>
          ) : null}

          {state.frequency === 'daily' || state.frequency === 'yearly' ? (
            <p className="composer-recurring-empty-state">This repeat type uses the next occurrence date as its anchor.</p>
          ) : null}
          <SelectionHint>Options depend on selected Repeat.</SelectionHint>
        </div>
      ) : null}

      {step === 'onDay' ? (
        <div className="composer-recurring-selection">
          <p className="composer-recurring-picker-caption">Choose the day of the month</p>
          <div className="composer-recurring-day-grid" aria-label="Monthly day of month">
            {dayOfMonthOptions().map((option) => (
              <button
                key={option.value}
                type="button"
                className={state.dayOfMonth === option.value ? 'selected' : ''}
                onClick={() => provided.commands.setDayOfMonth(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="composer-recurring-next-action" onClick={goSummary}>Done</button>
        </div>
      ) : null}

      {step === 'ends' ? (
        <div className="composer-recurring-selection">
          {endOptions.map((option) => (
            <OptionRadio
              key={option.value}
              option={{
                ...option,
                description: option.value === 'after_occurrences' ? `${state.endCount || '1'} occurrences` : option.description,
              }}
              selected={state.endKind === option.value}
              onSelect={selectEndKind}
            />
          ))}
          {state.endKind === 'on_date' ? (
            <ScheduleDateInput
              value={state.endDate}
              label="Recurrence end date"
              error={status.endDateError}
              errorId="composer-recurrence-end-date-error"
              onChange={provided.commands.setEndDate}
            />
          ) : null}
          {state.endKind === 'after_occurrences' ? (
            <>
              <input
                className="composer-recurring-inline-input"
                aria-label="Recurrence end count"
                type="number"
                min="1"
                step="1"
                value={state.endCount}
                onChange={(event) => provided.commands.setEndCount(event.target.value)}
                aria-invalid={Boolean(status.endCountError)}
                aria-describedby={status.endCountError ? 'composer-recurrence-end-count-error' : undefined}
              />
              {status.endCountError ? <p id="composer-recurrence-end-count-error" className="field-error">{status.endCountError}</p> : null}
            </>
          ) : null}
          {state.endKind === 'never' ? (
            <SelectionHint>Selecting a value returns to the main modal immediately.</SelectionHint>
          ) : (
            <button type="button" className="composer-recurring-next-action" onClick={goSummary}>Done</button>
          )}
        </div>
      ) : null}
    </div>
  );
}
