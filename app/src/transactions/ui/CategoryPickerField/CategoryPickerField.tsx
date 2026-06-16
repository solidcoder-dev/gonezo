import './CategoryPickerField.css';

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

const CATEGORY_ICON_BY_NAME: Record<string, string> = {
  bills: 'bi-receipt',
  groceries: 'bi-basket',
  dining: 'bi-cup-hot',
  transport: 'bi-bus-front',
  health: 'bi-heart-pulse',
  shopping: 'bi-bag',
  entertainment: 'bi-controller',
  travel: 'bi-airplane',
  'work income': 'bi-briefcase',
  investments: 'bi-graph-up-arrow',
  reimbursements: 'bi-arrow-left-right',
  'gifts & benefits': 'bi-gift',
  other: 'bi-three-dots',
};

function iconForCategory(name: string): string {
  return CATEGORY_ICON_BY_NAME[name.trim().toLowerCase()] ?? 'bi-tag';
}

export function CategoryPickerField({ required, provided }: Props) {
  const selectedCategory = required.options.find((category) => category.id === required.selectedCategoryId);
  const frequentCategories = required.frequentCategoryIds
    .map((id) => required.options.find((category) => category.id === id))
    .filter((category): category is CategoryOption => Boolean(category));
  const orderedCategories = [
    ...frequentCategories,
    ...required.options.filter((category) => !frequentCategories.some((frequent) => frequent.id === category.id)),
  ];

  function selectCategory(categoryId: string) {
    provided.onSelect(categoryId);
  }

  return (
    <div className="category-picker">
      <span className="category-picker-label">Category</span>
      <div className="category-picker-row" role="group" aria-label="Category">
        {orderedCategories.map((category) => {
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
              <i className={`bi ${iconForCategory(category.name)}`} aria-hidden />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
