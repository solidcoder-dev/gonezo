import { useId } from 'react';

type CategoryOption = {
  id: string;
  name: string;
};

type Props = {
  value: string;
  options: CategoryOption[];
  disabled: boolean;
  onChange: (value: string) => void;
};

export function CategoryComboboxField({ value, options, disabled, onChange }: Props) {
  const listId = useId();

  return (
    <label className="stack">
      Category
      <input
        aria-label="Category"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Choose or type a category (optional)"
        list={listId}
        autoComplete="off"
        disabled={disabled}
      />
      <datalist id={listId}>
        {options.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
      <span className="hint">Suggestions include all categories</span>
    </label>
  );
}
