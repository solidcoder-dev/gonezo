import { useId } from 'react';

type CategoryOption = {
  id: string;
  name: string;
};

export type CategoryComboboxFieldRequired = {
  value: string;
  options: CategoryOption[];
  disabled: boolean;
};

export type CategoryComboboxFieldProvided = {
  onChange: (value: string) => void;
};

type Props = {
  required: CategoryComboboxFieldRequired;
  provided: CategoryComboboxFieldProvided;
};

export function CategoryComboboxField({ required, provided }: Props) {
  const listId = useId();

  return (
    <label className="stack">
      Category
      <input
        aria-label="Category"
        value={required.value}
        onChange={(event) => provided.onChange(event.target.value)}
        placeholder="Choose or type a category (optional)"
        list={listId}
        autoComplete="off"
        disabled={required.disabled}
      />
      <datalist id={listId}>
        {required.options.map((category) => (
          <option key={category.id} value={category.name} />
        ))}
      </datalist>
      <span className="hint">Suggestions include all categories</span>
    </label>
  );
}
