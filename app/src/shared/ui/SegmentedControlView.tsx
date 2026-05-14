import type { ViewProps } from './ViewProps';

export type SegmentedControlOption<TValue extends string> = {
  value: TValue;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlViewProps<TValue extends string> = ViewProps<
  {
    ariaLabel: string;
    columns?: 2 | 3;
  },
  {
    options: Array<SegmentedControlOption<TValue>>;
  },
  {
    value: TValue;
  },
  {
    disabled?: boolean;
  },
  {
    select: (value: TValue) => void;
  }
>;

export function SegmentedControlView<TValue extends string>({
  required,
  provided,
}: SegmentedControlViewProps<TValue>) {
  const columnsClass = required.config.columns === 2 ? ' segmented-2' : '';

  return (
    <div className={`segmented${columnsClass}`} role="radiogroup" aria-label={required.config.ariaLabel}>
      {required.data.options.map((option) => {
        const selected = option.value === required.state.value;
        const disabled = required.status.disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? 'segment active' : 'segment'}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                provided.commands.select(option.value);
              }
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
