export interface StepSelectorProps {
  disabled: boolean;
  stepSize: string;
  showMore: boolean;
  visibleSteps: string[];
  moreSteps: string[];
  onToggleMore: () => void;
  onChangeStepSize: (value: string) => void;
}

export function StepSelector({
  disabled,
  stepSize,
  showMore,
  visibleSteps,
  moreSteps,
  onToggleMore,
  onChangeStepSize,
}: StepSelectorProps) {
  return (
    <>
      <div className="step-inline-row" aria-label="Step size">
        <div className="quick-row">
          {visibleSteps.map((value) => (
            <button
              key={value}
              type="button"
              className={stepSize === value ? 'chip active' : 'chip'}
              disabled={disabled}
              onClick={() => onChangeStepSize(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-button"
          aria-label="Toggle more steps"
          disabled={disabled}
          onClick={onToggleMore}
        >
          {showMore ? '−' : '+'}
        </button>
      </div>

      {showMore ? (
        <div className="quick-row" aria-label="More step size">
          {moreSteps.map((value) => (
            <button
              key={value}
              type="button"
              className={stepSize === value ? 'chip active' : 'chip'}
              disabled={disabled}
              onClick={() => onChangeStepSize(value)}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
