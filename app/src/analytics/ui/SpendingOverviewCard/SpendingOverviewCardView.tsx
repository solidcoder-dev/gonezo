import { AnalyticsPeriodMenuView } from '../AnalyticsPeriodMenuView';
import { SheetView } from '../../../shared/ui/SheetView';
import type { SpendingOverviewCardViewProps, SpendingOverviewCategoryView } from './SpendingOverviewCardView.contract';
import styles from './SpendingOverviewCardView.module.css';

function donutBackground(categories: SpendingOverviewCategoryView[]): string {
  if (categories.length === 0) {
    return 'conic-gradient(var(--color-brand-soft) 0 100%)';
  }
  let start = 0;
  const segments = categories.map((category) => {
    const end = start + category.percentage;
    const segment = `${category.color} ${start}% ${end}%`;
    start = end;
    return segment;
  });
  if (start < 100) {
    segments.push(`rgba(32, 32, 30, 0.08) ${start}% 100%`);
  }
  return `conic-gradient(${segments.join(', ')})`;
}

export function SpendingOverviewCardView({ required, provided }: SpendingOverviewCardViewProps) {
  const { categories, totalAmount, windowLabel } = required.data;
  const canShowBreakdown = categories.length > 0 && !required.status.loading;

  return (
    <>
      <section className={styles.card} aria-label="Spending overview" aria-busy={required.status.loading}>
        <div className={styles.header}>
          <div>
            <h2>Spending overview</h2>
            <span>{totalAmount}</span>
          </div>
          <AnalyticsPeriodMenuView
            required={{
              state: { granularity: required.state.granularity },
              status: { disabled: required.status.disabled || required.status.loading },
            }}
            provided={{ commands: { selectGranularity: provided.commands.selectGranularity } }}
          />
        </div>

        <div className={styles.windowNav}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Previous spending overview window"
            disabled={required.status.disabled || required.status.loading}
            onClick={provided.commands.goToPreviousWindow}
          >
            <i className="bi bi-chevron-left" aria-hidden />
          </button>
          <span>{windowLabel}</span>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Next spending overview window"
            disabled={required.status.disabled || required.status.loading || !required.state.canGoNextWindow}
            onClick={provided.commands.goToNextWindow}
          >
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
        </div>

        {required.status.loading ? (
          <SpendingOverviewSkeleton />
        ) : categories.length === 0 ? (
          <p className={styles.empty}>No spending data.</p>
        ) : (
          <div className={styles.body}>
            <div className={styles.donut} style={{ background: donutBackground(categories) }} aria-hidden />
          </div>
        )}

        <button
          type="button"
          className={styles.breakdownButton}
          disabled={required.status.disabled || !canShowBreakdown}
          onClick={provided.commands.openCategoryBreakdown}
        >
          View categories
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
      <span className={styles.skeletonDonut} />
      <span className={styles.skeletonLine} />
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
