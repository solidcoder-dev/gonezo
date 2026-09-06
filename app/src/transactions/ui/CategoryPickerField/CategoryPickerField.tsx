import { resolveTaxonomyIcon } from '../../application/movementIconPresentation';
import styles from './CategoryPickerField.module.css';

type CategoryOption = {
  id: string;
  name: string;
};

export type CategoryPickerFieldRequired = {
  selectedCategoryId?: string;
  options: CategoryOption[];
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
    <div className={styles.root}>
      <span className={styles.label}>Category</span>
      <div className={styles.row} role="group" aria-label="Category">
        {required.options.map((category) => {
          const selected = category.id === selectedCategory?.id;
          return (
            <button
              key={category.id}
              type="button"
              className={selected ? `${styles.chip} ${styles.selected} selected` : styles.chip}
              aria-label={`Select category ${category.name}`}
              title={category.name}
              disabled={required.disabled}
              onClick={() => selectCategory(category.id)}
            >
              <span className={styles.chipSurface}>
                <i className={resolveTaxonomyIcon(category.name).className} aria-hidden />
                <span>{category.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
