import type { MonthlyTimelineItemViewModel } from '../../movements/application/monthlyMovementsTimeline';
import styles from './MovementTimelineRowView.module.css';

type MovementTimelineRowViewProps = {
  item: MonthlyTimelineItemViewModel;
  disabled: boolean;
  onSelect: () => void;
};

export function MovementTimelineRowView({ item, disabled, onSelect }: MovementTimelineRowViewProps) {
  return (
    <li className={`${styles.row} ${item.ignored ? `${styles.ignored} monthly-timeline-row--ignored` : ''}`}>
      <button
        type="button"
        className={styles.button}
        onClick={onSelect}
        disabled={disabled}
        aria-label={`${item.title}, ${item.amountSign}${item.amountLabel}, ${item.metadata.join(' · ')}`}
      >
        <span
          className={`${styles.icon} ${styles[`icon--${item.icon.tone}`] ?? ''}`}
          role="img"
          aria-label={item.icon.accessibleLabel}
        >
          <i className={item.icon.className} />
        </span>
        <span className={styles.content}>
          <span className={styles.primary}>
            <strong className={styles.title}>{item.title}</strong>
            <strong className={`${styles.amount} ${styles[`amount--${item.direction}`] ?? ''}`}>
              {item.amountSign}{item.amountLabel}
            </strong>
          </span>
          <span className={styles.metadata}>{item.metadata.join(' · ')}</span>
        </span>
      </button>
    </li>
  );
}
