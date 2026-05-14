import { DatalistFieldView } from '../../shared/ui/DatalistFieldView';

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
  return (
    <DatalistFieldView
      required={{
        config: {
          label: 'Category',
          placeholder: 'Choose or type a category (optional)',
          hint: 'Suggestions include all categories',
        },
        data: {
          options: required.options.map((category) => ({
            id: category.id,
            value: category.name,
          })),
        },
        state: { value: required.value },
        status: { disabled: required.disabled },
      }}
      provided={{ commands: { change: provided.onChange } }}
    />
  );
}
