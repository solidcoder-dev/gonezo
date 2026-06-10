import { DatalistFieldView } from '../../shared/ui/DatalistFieldView';

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
  return (
    <DatalistFieldView
      required={{
        config: {
          label: 'Tags',
          placeholder: 'Choose existing or type new tags, separated by commas',
        },
        data: {
          options: required.options.map((tag) => ({
            id: tag.id,
            value: tag.name,
          })),
        },
        state: { value: required.value },
        status: { disabled: required.disabled },
      }}
      provided={{ commands: { change: provided.onChange } }}
    />
  );
}
