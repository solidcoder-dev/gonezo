import { useId } from 'react';

type TagOption = {
  id: string;
  name: string;
};

type Props = {
  value: string;
  options: TagOption[];
  disabled: boolean;
  onChange: (value: string) => void;
};

export function TagComboboxField({ value, options, disabled, onChange }: Props) {
  const listId = useId();

  return (
    <label className="stack">
      Tags
      <input
        aria-label="Tags"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Choose existing or type new tags, separated by commas"
        list={listId}
        autoComplete="off"
        disabled={disabled}
      />
      <datalist id={listId}>
        {options.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
      <span className="hint">Use commas to add multiple tags</span>
    </label>
  );
}
