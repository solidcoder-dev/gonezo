import type { ViewProps } from './ViewProps';
import styles from './SegmentedControlView.module.css';

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
  return (
    <div className={`${styles.control} ${required.config.columns === 2 ? styles.twoColumns : ''}`} role="radiogroup" aria-label={required.config.ariaLabel}>
      {required.data.options.map((option) => {
        const selected = option.value === required.state.value;
        const disabled = required.status.disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`btn btn-outline-primary ${styles.option} ${selected ? styles.selected : ''}`}
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
