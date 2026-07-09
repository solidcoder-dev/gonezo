import type { OverviewSnapshotCardViewProps, OverviewSnapshotHighlightView } from './OverviewSnapshotCardView.contract';
import styles from './OverviewSnapshotCardView.module.css';

export function OverviewSnapshotCardView({ required }: OverviewSnapshotCardViewProps) {
  const { comparisonPercent, currentWindowLabel, expenseAmount, expenseShare, highlights, incomeAmount, incomeShare, netFlowAmount, previousWindowLabel } = required.data;
  const netFlowNegative = isNegativeValue(netFlowAmount);
  const comparisonNegative = comparisonPercent ? isNegativeValue(comparisonPercent) : false;

  return (
    <section className={styles.overview} aria-label="Overview snapshot" aria-busy={required.status.loading}>
      <article className={styles.summaryCard}>
        <header className={styles.header}>
          <div>
            <h2>{currentWindowLabel}</h2>
            {previousWindowLabel ? <p>{`Compared to ${previousWindowLabel}`}</p> : null}
          </div>
        </header>

        {required.status.loading ? (
          <OverviewSnapshotSkeleton />
        ) : (
          <>
            <div className={styles.summarySection}>
              <h3>Income vs Expenses</h3>
              <div className={styles.summaryList}>
                <SummaryRow amount={incomeAmount} share={incomeShare} tone="income" />
                <SummaryRow amount={expenseAmount} share={expenseShare} tone="expense" />
              </div>
            </div>

            <div className={styles.netFlowRow}>
              <div className={styles.netFlowSummary}>
                <span>Net flow</span>
                <strong className={netFlowNegative ? styles.netFlowAmountNegative : styles.netFlowAmountPositive}>{netFlowAmount}</strong>
              </div>
              {comparisonPercent ? (
                <div className={comparisonNegative ? styles.comparisonBadgeNegative : styles.comparisonBadgePositive}>
                  <strong>{comparisonPercent}</strong>
                  <span>vs previous period</span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </article>

      {!required.status.loading && highlights.length > 0 ? (
        <div className={styles.highlightsGrid}>
          {highlights.map((highlight) => (
            <HighlightCard highlight={highlight} key={highlight.key} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SummaryRow(
  { amount, share, tone }: { amount: string; share: number; tone: 'income' | 'expense' },
) {
  return (
    <div className={styles.summaryRow}>
      <strong className={tone === 'income' ? styles.incomeAmount : styles.expenseAmount}>{amount}</strong>
      <span className={styles.progressTrack}>
        <span
          className={tone === 'income' ? styles.progressFillIncome : styles.progressFillExpense}
          style={{ width: `${Math.max(4, Math.min(100, share))}%` }}
        />
      </span>
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: OverviewSnapshotHighlightView }) {
  return (
    <article className={styles.highlightCard}>
      <span className={highlight.tone === 'income' ? styles.highlightIconIncome : styles.highlightIconExpense}>
        <i className={highlight.iconClassName} aria-hidden />
      </span>
      <div className={styles.highlightContent}>
        <span className={styles.highlightLabel}>{highlight.label}</span>
        <strong className={styles.highlightTitle}>{highlight.title}</strong>
        <strong className={highlight.tone === 'income' ? styles.incomeAmount : styles.expenseAmount}>{highlight.amount}</strong>
        <span className={styles.highlightDate}>{highlight.occurredOn}</span>
      </div>
    </article>
  );
}

function OverviewSnapshotSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading overview snapshot">
      <span className={styles.skeletonLineWide} />
      <span className={styles.skeletonLine} />
      <span className={styles.skeletonLine} />
      <span className={styles.skeletonCards} />
    </div>
  );
}

function isNegativeValue(value: string): boolean {
  return value.trim().startsWith('-');
}

export type { OverviewSnapshotCardViewProps } from './OverviewSnapshotCardView.contract';
