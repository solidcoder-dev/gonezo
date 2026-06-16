import type { ViewProps } from '../ViewProps';

export type MultiTagPickerOption = {
  id: string;
  name: string;
};

export type MultiTagPickerViewProps = ViewProps<
  {
    label: string;
    placeholder: string;
    maxSuggestions?: number;
  },
  {
    selectedTags: MultiTagPickerOption[];
    suggestions: MultiTagPickerOption[];
  },
  {
    query: string;
    createCandidate?: string;
  },
  {
    disabled?: boolean;
    error?: string;
  },
  {
    changeQuery: (value: string) => void;
    selectTag: (tagId: string) => void;
    removeTag: (tagId: string) => void;
    createTag: (name: string) => void;
    removeLastTag: () => void;
  }
>;
