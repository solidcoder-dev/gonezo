import styles from './ChartSkeletonView.module.css';

const GROUPS = [
  { expense: 34, income: 58 },
  { expense: 46, income: 72 },
  { expense: 28, income: 44 },
  { expense: 62, income: 86 },
  { expense: 38, income: 55 },
  { expense: 52, income: 68 },
];

export function ChartSkeletonView() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading cash flow chart">
      <div className={styles.plot} aria-hidden>
        <div className={styles.axis} />
        {GROUPS.map((group, index) => (
          <div className={styles.group} key={`${group.expense}-${group.income}-${index}`}>
            <div className={styles.bar} style={{ height: `${group.expense}%` }} />
            <div className={`${styles.bar} ${styles.barStrong}`} style={{ height: `${group.income}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
