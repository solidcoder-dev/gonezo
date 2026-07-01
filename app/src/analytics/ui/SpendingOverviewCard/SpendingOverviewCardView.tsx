import { SheetView } from '../../../shared/ui/SheetView';
import type { SpendingOverviewCardViewProps, SpendingOverviewCategoryView } from './SpendingOverviewCardView.contract';
import styles from './SpendingOverviewCardView.module.css';

const CATEGORY_ICONS = ['bi bi-fork-knife', 'bi bi-suitcase-lg', 'bi bi-cart-fill', 'bi bi-car-front-fill', 'bi bi-three-dots'];

export function SpendingOverviewCardView({ required, provided }: SpendingOverviewCardViewProps) {
  const { categories, totalAmount, windowLabel } = required.data;
  const canShowBreakdown = categories.length > 0 && !required.status.loading;
  const topCategories = categories.slice(0, 5);

  return (
    <>
      <section className={styles.card} aria-label="Spending overview" aria-busy={required.status.loading}>
        <div className={styles.header}>
          <div>
            <h2>Top spending categories</h2>
            <span>{totalAmount} in {windowLabel}</span>
          </div>
          <button
            type="button"
            className={styles.headerAction}
            aria-label="Open spending categories"
            disabled={required.status.disabled || !canShowBreakdown}
            onClick={provided.commands.openCategoryBreakdown}
          >
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
        </div>

        {required.status.loading ? (
          <SpendingOverviewSkeleton />
        ) : categories.length === 0 ? (
          <p className={styles.empty}>No spending data.</p>
        ) : (
          <CategoryBarList categories={topCategories} />
        )}

        <button
          type="button"
          className={styles.breakdownButton}
          disabled={required.status.disabled || !canShowBreakdown}
          onClick={provided.commands.openCategoryBreakdown}
        >
          <span>See all categories</span>
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </section>

      <SheetView
        required={{
          config: {
            ariaLabel: 'Spending categories',
            title: 'Spending categories',
            closeLabel: 'Close spending categories',
            showHandle: true,
          },
          data: {
            body: <CategoryBreakdown categories={categories} />,
          },
          state: { open: required.state.categoryBreakdownOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closeCategoryBreakdown } }}
      />
    </>
  );
}

function SpendingOverviewSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading spending overview">
      {Array.from({ length: 5 }, (_, index) => (
        <span className={styles.skeletonLine} key={index} />
      ))}
    </div>
  );
}

function CategoryBarList({ categories }: { categories: SpendingOverviewCategoryView[] }) {
  return (
    <div className={styles.categoryList}>
      {categories.map((category, index) => (
        <div className={styles.categoryItem} key={category.key}>
          <span className={styles.categoryIcon} style={{ background: category.color }}>
            <i className={CATEGORY_ICONS[index] ?? CATEGORY_ICONS[CATEGORY_ICONS.length - 1]} aria-hidden />
          </span>
          <span className={styles.categoryDetails}>
            <span className={styles.categoryMeta}>
              <strong>{category.name}</strong>
              <span>{category.amount}</span>
              <span>{category.percentage}%</span>
            </span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{
                  background: category.color,
                  width: `${Math.max(2, Math.min(100, category.percentage))}%`,
                }}
              />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ categories }: { categories: SpendingOverviewCategoryView[] }) {
  return (
    <div className={styles.sheetList}>
      {categories.map((category) => (
        <div className={styles.row} key={category.key}>
          <span className={styles.swatch} style={{ background: category.color }} />
          <span className={styles.name}>{category.name}</span>
          <span className={styles.amount}>{category.amount}</span>
          <span className={styles.percentage}>{category.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

export type { SpendingOverviewCardViewProps } from './SpendingOverviewCardView.contract';
