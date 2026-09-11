import type { OverviewSnapshotCardViewProps } from './OverviewSnapshotCardView.contract';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import styles from './OverviewSnapshotCardView.module.css';

export function OverviewSnapshotCardView({ required }: OverviewSnapshotCardViewProps) {
  const { comparisonDirection, comparisonTone, comparisonPercent, currentWindowLabel, expenseAmount, expenseShare, incomeAmount, incomeShare, netFlowAmount, previousWindowLabel } = required.data;
  const visibility = required.status.amountVisibility ?? 'visible';

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
            <div className={styles.netFlowBlock}>
              <span>Net flow</span>
              <div className={styles.netFlowLine}>
                    <FinancialAmountView formattedAmount={netFlowAmount} visibility={visibility} className={styles.netFlowAmountNeutral} />
                {comparisonPercent ? (
                  <div className={styles[`comparisonBadge${capitalizeTone(comparisonTone)}`]}>
                    <span aria-hidden>{comparisonDirection === 'up' ? '↑' : comparisonDirection === 'down' ? '↓' : '→'}</span>
                    <strong>{comparisonPercent}</strong>
                    <span>vs previous period</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.totalsGrid}>
              <SummaryColumn label="Income" amount={incomeAmount} share={incomeShare} tone="income" visibility={visibility} />
              <SummaryColumn label="Expenses" amount={expenseAmount} share={expenseShare} tone="expense" visibility={visibility} />
            </div>
          </>
        )}
      </article>
    </section>
  );
}

function SummaryColumn({ label, amount, share, tone, visibility }: { label: string; amount: string; share: number; tone: 'income' | 'expense'; visibility: 'visible' | 'hidden' }) {
  const visibleShare = share > 0 ? Math.max(2, Math.min(100, share)) : 0;
  return (
    <div className={styles.summaryColumn}>
      <span className={styles.summaryLabel}>{label}</span>
      <FinancialAmountView formattedAmount={amount} visibility={visibility} className={tone === 'income' ? styles.incomeAmount : styles.expenseAmount} />
      <span className={styles.progressTrack} aria-hidden>
        <span className={tone === 'income' ? styles.progressFillIncome : styles.progressFillExpense} style={{ width: `${visibleShare}%` }} />
      </span>
    </div>
  );
}

function OverviewSnapshotSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading overview snapshot">
      <span className={styles.skeletonLineWide} />
      <span className={styles.skeletonNetFlow} />
      <span className={styles.skeletonColumns} />
    </div>
  );
}

export type { OverviewSnapshotCardViewProps } from './OverviewSnapshotCardView.contract';

function capitalizeTone(tone: 'income' | 'expense' | 'neutral'): string {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}
