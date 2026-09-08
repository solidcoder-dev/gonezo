import styles from './MonthNavigatorView.module.css';

export type MonthNavigatorViewRequired = {
  monthLabel: string;
  disabled: boolean;
  monthMenuOpen: boolean;
  isCurrentMonth: boolean;
};

export type MonthNavigatorViewProvided = {
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToggleMenu: () => void;
  onGoToCurrentMonth: () => void;
  onOpenMonthPicker: () => void;
};

export type MonthNavigatorViewProps = {
  required: MonthNavigatorViewRequired;
  provided: MonthNavigatorViewProvided;
};

export function MonthNavigatorView({ required, provided }: MonthNavigatorViewProps) {
  const { monthLabel, disabled, monthMenuOpen, isCurrentMonth } = required;

  return (
    <div className={`${styles.navigator} position-sticky bg-body`} aria-label="Monthly navigation">
      <div className="d-flex align-items-center justify-content-between gap-2" role="group" aria-label="Switch month">
        <button
          type="button"
          className="gz-icon-button flex-shrink-0"
          onClick={provided.onPreviousMonth}
          disabled={disabled}
          aria-label="Previous month"
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>

        <div className={`${styles.center} position-relative flex-grow-1`}>
          <button
            type="button"
            className={`${styles.trigger} btn w-100 d-flex align-items-center justify-content-center gap-2`}
            onClick={provided.onToggleMenu}
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={monthMenuOpen}
            aria-label="Choose month"
          >
            <span className="text-body fw-semibold text-nowrap">{monthLabel}</span>
            <span aria-hidden>
              <i className="bi bi-chevron-down" aria-hidden />
            </span>
          </button>

          {monthMenuOpen ? (
            <div className="dropdown-menu dropdown-menu-end show" role="menu" aria-label="Month actions">
              {!isCurrentMonth ? (
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  onClick={provided.onGoToCurrentMonth}
                  disabled={disabled}
                  aria-label="Today"
                >
                  Today
                </button>
              ) : null}
              <button
                type="button"
                className="dropdown-item"
                role="menuitem"
                onClick={provided.onOpenMonthPicker}
                disabled={disabled}
                aria-label="Select month"
              >
                Select month
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="gz-icon-button flex-shrink-0"
          onClick={provided.onNextMonth}
          disabled={disabled}
          aria-label="Next month"
        >
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </div>
    </div>
  );
}
