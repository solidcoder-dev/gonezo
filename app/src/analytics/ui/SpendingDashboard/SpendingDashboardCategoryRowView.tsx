import type { SpendingDashboardCategoryView } from './SpendingDashboardView.contract';
import styles from './SpendingDashboardView.module.css';

export type SpendingDashboardCategoryRowViewProps = {
  required: {
    data: {
      category: SpendingDashboardCategoryView;
    };
  };
};

export function SpendingDashboardCategoryRowView({ required }: SpendingDashboardCategoryRowViewProps) {
  const { category } = required.data;

  return (
    <div className={styles.categoryRow}>
      <span className={styles.categoryName}>{category.name}</span>
      <div className={styles.categoryMetricColumn} aria-label={`${category.name} spending share`}>
        <span className={styles.categoryMetricHeader}>
          <span className={styles.categoryAmount}>{category.amount}</span>
          <span className={styles.categoryPercentage}>{category.percentage}%</span>
        </span>
        <div className={styles.categoryMetricTrack}>
          <span
            className={styles.categoryMetricFill}
            style={{
              width: `${Math.max(4, Math.min(100, category.percentage))}%`,
              background: category.color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
