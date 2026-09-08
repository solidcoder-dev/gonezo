import styles from './YearMonthSelectorView.module.css';

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
    <div className={`${styles.selector} vstack gap-2`} aria-label="Month selector">
      <div className="d-flex align-items-center justify-content-between gap-2" role="group" aria-label="Select year">
        <button
          type="button"
          className="gz-icon-button"
          onClick={provided.onPreviousYear}
          disabled={disabled}
          aria-label="Previous year"
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>
        <p className="flex-grow-1 text-center m-0 fw-semibold" aria-live="polite" aria-atomic="true">
          {year}
        </p>
        <button
          type="button"
          className="gz-icon-button"
          onClick={provided.onNextYear}
          disabled={disabled}
          aria-label="Next year"
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>

      <div className="row g-2" role="group" aria-label={`Months in ${year}`}>
        {MONTH_ABBREVIATIONS.map((monthLabel, monthIndex) => {
          const isViewed = viewedYear === year && viewedMonthIndex === monthIndex;
          const isCurrent = currentYear === year && currentMonthIndex === monthIndex;

          return (
            <button
              key={monthLabel}
              type="button"
              className={`col-4 ${styles.monthButton} ${isViewed ? styles.viewed : ''}`}
              aria-label={`Select ${monthLabel} ${year}`}
              aria-pressed={isViewed}
              aria-current={isCurrent ? 'date' : undefined}
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
