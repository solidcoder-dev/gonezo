import { useId } from 'react';

type TagOption = {
  id: string;
  name: string;
};

export type TagComboboxFieldRequired = {
  value: string;
  options: TagOption[];
  disabled: boolean;
};

export type TagComboboxFieldProvided = {
  onChange: (value: string) => void;
};

type Props = {
  required: TagComboboxFieldRequired;
  provided: TagComboboxFieldProvided;
};

export function TagComboboxField({ required, provided }: Props) {
  const listId = useId();

  return (
    <label className="stack">
      Tags
      <input
        aria-label="Tags"
        value={required.value}
        onChange={(event) => provided.onChange(event.target.value)}
        placeholder="Choose existing or type new tags, separated by commas"
        list={listId}
        autoComplete="off"
        disabled={required.disabled}
      />
      <datalist id={listId}>
        {required.options.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
      <span className="hint">Use commas to add multiple tags</span>
    </label>
  );
}
