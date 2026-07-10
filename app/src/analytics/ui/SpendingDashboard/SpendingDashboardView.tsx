import { SheetView } from '../../../shared/ui/SheetView';
import type { SpendingDashboardCategoryView, SpendingDashboardViewProps } from './SpendingDashboardView.contract';
import { SpendingDashboardCategoryRowView } from './SpendingDashboardCategoryRowView';
import styles from './SpendingDashboardView.module.css';

export function SpendingDashboardView({ required, provided }: SpendingDashboardViewProps) {
  return (
    <>
      <div className={styles.stack} aria-busy={required.status.loading}>
        <section className={styles.card} aria-label="Spending summary">
          <div className={styles.summaryHeader}>
            <h2 className={styles.sectionTitle}>Total spending</h2>
            {required.data.previousWindowLabel ? (
              <p className={styles.comparisonLabel}>{`Compared to ${required.data.previousWindowLabel}`}</p>
            ) : null}
          </div>
          {required.status.loading ? (
            <div className={styles.summarySkeleton} role="status" aria-label="Loading spending summary" />
          ) : (
            <div className={styles.summaryRow}>
              <strong className={styles.totalAmount}>{required.data.totalAmount}</strong>
              {required.data.comparisonAmount ? (
                <span className={required.data.comparisonAmount.startsWith('-') ? styles.badgeNegative : styles.badgePositive}>
                  <strong>{required.data.comparisonAmount}</strong>
                  <span>vs previous period</span>
                </span>
              ) : null}
            </div>
          )}
        </section>

        <section className={styles.card} aria-label="Spending breakdown">
          <h2 className={styles.sectionTitle}>Where your money went</h2>
          {required.status.loading ? (
            <div className={styles.listSkeleton} role="status" aria-label="Loading spending categories">
              {Array.from({ length: 5 }, (_, index) => <span className={styles.skeletonLine} key={index} />)}
            </div>
          ) : required.data.visibleCategories.length === 0 ? (
            <p className={styles.empty}>No spending data.</p>
          ) : (
            <>
              <CategoryList categories={required.data.visibleCategories} />
              <button type="button" className={styles.breakdownButton} onClick={provided.commands.openBreakdown}>
                <span>See all categories</span>
                <i className="bi bi-chevron-right" aria-hidden />
              </button>
            </>
          )}
        </section>
      </div>

      <SheetView
        required={{
          config: {
            ariaLabel: 'Spending categories',
            title: 'Spending categories',
            closeLabel: 'Close spending categories',
            showHandle: true,
          },
          data: {
            body: <CategoryList categories={required.data.allCategories} />,
          },
          state: { open: required.state.breakdownOpen },
          status: {},
        }}
        provided={{ commands: { close: provided.commands.closeBreakdown } }}
      />
    </>
  );
}

function CategoryList({ categories }: { categories: SpendingDashboardCategoryView[] }) {
  return (
    <div className={styles.categoryList}>
      {categories.map((category) => (
        <SpendingDashboardCategoryRowView
          key={category.key}
          required={{ data: { category } }}
        />
      ))}
    </div>
  );
}

export type { SpendingDashboardViewProps } from './SpendingDashboardView.contract';
