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
    <div className="month-nav month-nav--minimal" aria-label="Monthly navigation">
      <div className="month-nav-main month-nav-main--minimal" role="group" aria-label="Switch month">
        <button
          type="button"
          className="text-button month-nav-arrow"
          onClick={provided.onPreviousMonth}
          disabled={disabled}
          aria-label="Previous month"
        >
          <i className="bi bi-chevron-left" aria-hidden />
        </button>

        <div className="month-nav-center">
          <button
            type="button"
            className="text-button month-nav-trigger"
            onClick={provided.onToggleMenu}
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={monthMenuOpen}
            aria-label="Choose month"
          >
            <span className="month-nav-trigger-label">{monthLabel}</span>
            <span className="month-nav-trigger-caret" aria-hidden>
              <i className="bi bi-chevron-down" aria-hidden />
            </span>
          </button>

          {monthMenuOpen ? (
            <div className="month-nav-menu" role="menu" aria-label="Month actions">
              {!isCurrentMonth ? (
                <button
                  type="button"
                  className="text-button month-nav-menu-item"
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
                className="text-button month-nav-menu-item"
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
          className="text-button month-nav-arrow"
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
