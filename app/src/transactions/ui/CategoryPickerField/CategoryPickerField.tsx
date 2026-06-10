import { useState } from 'react';
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

const COLLAPSED_CATEGORY_COUNT = 5;

function iconForCategory(name: string): string {
  return CATEGORY_ICON_BY_NAME[name.trim().toLowerCase()] ?? 'bi-tag';
}

export function CategoryPickerField({ required, provided }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectedCategory = required.options.find((category) => category.id === required.selectedCategoryId);
  const frequentCategories = required.frequentCategoryIds
    .map((id) => required.options.find((category) => category.id === id))
    .filter((category): category is CategoryOption => Boolean(category));
  const orderedCategories = [
    ...frequentCategories,
    ...required.options.filter((category) => !frequentCategories.some((frequent) => frequent.id === category.id)),
  ];
  const visibleCategories = expanded ? orderedCategories : orderedCategories.slice(0, COLLAPSED_CATEGORY_COUNT);
  const selectedCategoryVisible = visibleCategories.some((category) => category.id === selectedCategory?.id);
  const categoriesToRender = selectedCategory && !selectedCategoryVisible
    ? [...visibleCategories, selectedCategory]
    : visibleCategories;
  const hasHiddenCategories = orderedCategories.length > COLLAPSED_CATEGORY_COUNT;

  function selectCategory(categoryId: string) {
    provided.onSelect(categoryId);
  }

  return (
    <div className="category-picker">
      <span className="category-picker-label">Category</span>
      <div className="category-picker-row" role="group" aria-label="Category">
        {categoriesToRender.map((category) => {
          const selected = category.id === selectedCategory?.id;
          return (
            <button
              key={category.id}
              type="button"
              className={selected ? 'category-chip selected' : 'category-chip icon-only'}
              aria-label={`Select category ${category.name}`}
              title={category.name}
              disabled={required.disabled}
              onClick={() => selectCategory(category.id)}
            >
              <i className={`bi ${iconForCategory(category.name)}`} aria-hidden />
              {selected ? <span>{category.name}</span> : null}
            </button>
          );
        })}
        {hasHiddenCategories ? (
          <button
            type="button"
            className="category-chip icon-only"
            aria-label={expanded ? 'Show fewer categories' : 'Show more categories'}
            title={expanded ? 'Show fewer categories' : 'Show more categories'}
            disabled={required.disabled}
            onClick={() => setExpanded((current) => !current)}
          >
            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-three-dots'}`} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
