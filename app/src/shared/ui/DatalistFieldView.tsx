import { useId } from 'react';
import type { ViewProps } from './ViewProps';

export type DatalistFieldOptionView = {
  id: string;
  value: string;
};

export type DatalistFieldViewProps = ViewProps<
  {
    label: string;
    ariaLabel?: string;
    placeholder?: string;
    hint?: string;
    autoComplete?: string;
  },
  {
    options: DatalistFieldOptionView[];
  },
  {
    value: string;
  },
  {
    disabled?: boolean;
  },
  {
    change: (value: string) => void;
  }
>;

export function DatalistFieldView({ required, provided }: DatalistFieldViewProps) {
  const listId = useId();
  const { config, data, state, status } = required;

  return (
    <label className="vstack gap-2">
      <span className="form-label mb-0">{config.label}</span>
      <input
        className="form-control"
        aria-label={config.ariaLabel ?? config.label}
        value={state.value}
        onChange={(event) => provided.commands.change(event.target.value)}
        placeholder={config.placeholder}
        list={listId}
        autoComplete={config.autoComplete ?? 'off'}
        disabled={status.disabled}
      />
      <datalist id={listId}>
        {data.options.map((option) => (
          <option key={option.id} value={option.value} />
        ))}
      </datalist>
      {config.hint ? <span className="form-text">{config.hint}</span> : null}
    </label>
  );
}
