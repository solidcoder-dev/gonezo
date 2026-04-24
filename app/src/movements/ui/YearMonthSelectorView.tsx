const MONTH_ABBREVIATIONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

export type YearMonthSelectorViewRequired = {
  year: number;
  viewedYear: number;
  viewedMonthIndex: number;
  currentYear: number;
  currentMonthIndex: number;
  disabled: boolean;
};

export type YearMonthSelectorViewProvided = {
  onPreviousYear: () => void;
  onNextYear: () => void;
  onSelectMonth: (monthIndex: number) => void;
};

export type YearMonthSelectorViewProps = {
  required: YearMonthSelectorViewRequired;
  provided: YearMonthSelectorViewProvided;
};

function monthButtonClass(isViewed: boolean, isCurrent: boolean): string {
  if (isViewed && isCurrent) {
    return 'month-selector-month-button month-selector-month-button--viewed month-selector-month-button--current month-selector-month-button--viewed-current';
  }
  if (isViewed) {
    return 'month-selector-month-button month-selector-month-button--viewed';
  }
  if (isCurrent) {
    return 'month-selector-month-button month-selector-month-button--current';
  }
  return 'month-selector-month-button';
}

export function YearMonthSelectorView({ required, provided }: YearMonthSelectorViewProps) {
  const {
    year,
    viewedYear,
    viewedMonthIndex,
    currentYear,
    currentMonthIndex,
    disabled,
  } = required;

  return (
    <div className="month-selector stack" aria-label="Month selector">
      <div className="month-selector-year-row" role="group" aria-label="Select year">
        <button
          type="button"
          className="text-button month-selector-year-button"
          onClick={provided.onPreviousYear}
          disabled={disabled}
          aria-label="Previous year"
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>
        <p className="month-selector-year-value" aria-live="polite" aria-atomic="true">
          {year}
        </p>
        <button
          type="button"
          className="text-button month-selector-year-button"
          onClick={provided.onNextYear}
          disabled={disabled}
          aria-label="Next year"
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>

      <div className="month-selector-grid" role="group" aria-label={`Months in ${year}`}>
        {MONTH_ABBREVIATIONS.map((monthLabel, monthIndex) => {
          const isViewed = viewedYear === year && viewedMonthIndex === monthIndex;
          const isCurrent = currentYear === year && currentMonthIndex === monthIndex;

          return (
            <button
              key={monthLabel}
              type="button"
              className={monthButtonClass(isViewed, isCurrent)}
              aria-label={`Select ${monthLabel} ${year}`}
              aria-pressed={isViewed}
              onClick={() => provided.onSelectMonth(monthIndex)}
              disabled={disabled}
            >
              <span>{monthLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
