import './CategoryPickerField.css';
import { resolveTaxonomyIcon } from '../../application/movementIconPresentation';

type CategoryOption = {
  id: string;
  name: string;
};

export type CategoryPickerFieldRequired = {
  selectedCategoryId?: string;
  options: CategoryOption[];
  frequentCategoryIds: string[];
  disabled: boolean;
};

export type CategoryPickerFieldProvided = {
  onSelect: (categoryId: string) => void;
};

type Props = {
  required: CategoryPickerFieldRequired;
  provided: CategoryPickerFieldProvided;
};

export function CategoryPickerField({ required, provided }: Props) {
  const selectedCategory = required.options.find((category) => category.id === required.selectedCategoryId);

  function selectCategory(categoryId: string) {
    provided.onSelect(categoryId);
  }

  return (
    <div className="category-picker">
      <span className="category-picker-label">Category</span>
      <div className="category-picker-row" role="group" aria-label="Category">
        {required.options.map((category) => {
          const selected = category.id === selectedCategory?.id;
          return (
            <button
              key={category.id}
              type="button"
              className={selected ? 'category-chip selected' : 'category-chip'}
              aria-label={`Select category ${category.name}`}
              title={category.name}
              disabled={required.disabled}
              onClick={() => selectCategory(category.id)}
            >
              <i className={resolveTaxonomyIcon(category.name).className} aria-hidden />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
