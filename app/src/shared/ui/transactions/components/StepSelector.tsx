export type StepSelectorRequired = {
  disabled: boolean;
  stepSize: string;
  showMore: boolean;
  visibleSteps: string[];
  moreSteps: string[];
};

export type StepSelectorProvided = {
  onToggleMore: () => void;
  onChangeStepSize: (value: string) => void;
};

export type StepSelectorProps = {
  required: StepSelectorRequired;
  provided: StepSelectorProvided;
};

export function StepSelector({ required, provided }: StepSelectorProps) {
  return (
    <>
      <div className="step-inline-row" aria-label="Step size">
        <div className="quick-row">
          {required.visibleSteps.map((value) => (
            <button
              key={value}
              type="button"
              className={required.stepSize === value ? 'chip active' : 'chip'}
              disabled={required.disabled}
              onClick={() => provided.onChangeStepSize(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-button"
          aria-label="Toggle more steps"
          disabled={required.disabled}
          onClick={provided.onToggleMore}
        >
          {required.showMore ? <i className="bi bi-dash-lg" aria-hidden /> : <i className="bi bi-plus-lg" aria-hidden />}
        </button>
      </div>

      {required.showMore ? (
        <div className="quick-row" aria-label="More step size">
          {required.moreSteps.map((value) => (
            <button
              key={value}
              type="button"
              className={required.stepSize === value ? 'chip active' : 'chip'}
              disabled={required.disabled}
              onClick={() => provided.onChangeStepSize(value)}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
