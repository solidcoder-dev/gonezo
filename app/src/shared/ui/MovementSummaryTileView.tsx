import type { MonthlyTimelineItemViewModel } from '../../movements/application/monthlyMovementsTimeline';
import styles from './MovementSummaryTileView.module.css';
import { FinancialAmountView } from './FinancialAmount/FinancialAmountView';
import type { AmountVisibility } from '../domain/amountVisibility';

export type MovementSummaryTileViewProps = {
  item: MonthlyTimelineItemViewModel;
  disabled: boolean;
  onSelect: () => void;
  trailingMetadata?: string;
  metadataCounters?: {
    itemCount?: number;
    shareCount?: number;
  };
  amountVisibility?: AmountVisibility;
};

export function MovementSummaryTileView({ item, disabled, onSelect, trailingMetadata, metadataCounters, amountVisibility }: MovementSummaryTileViewProps) {
  return (
    <li className={`${styles.row} ${item.ignored ? `${styles.ignored} monthly-timeline-row--ignored` : ''}`}>
      <button
        type="button"
        className={`${styles.button} d-flex align-items-center gap-2`}
        onClick={onSelect}
        disabled={disabled}
        aria-label={`${item.title}, ${amountVisibility === 'hidden' ? 'Amount hidden' : `${item.amountSign}${item.amountLabel}`}, ${item.metadata.join(' · ')}${trailingMetadata ? `, ${trailingMetadata}` : ''}`}
      >
        <span
          className={`${styles.icon} ${styles[`icon--${item.icon.tone}`] ?? ''}`}
          role="img"
          aria-label={item.icon.accessibleLabel}
        >
          <i className={item.icon.className} />
        </span>
        <span className={`${styles.content} ${styles.homeLayout} d-grid gap-1 flex-grow-1`}>
          <span className={`${styles.homeMain} d-grid gap-1`}>
            <strong className={styles.title}>{item.title}</strong>
            <span className={`${styles.homeMetadataRow} d-flex align-items-center gap-2`}>
              <span className={`${styles.metadata} flex-grow-1`}>{item.metadata.join(' · ')}</span>
              <span className="d-flex align-items-center gap-2 flex-shrink-0">
                {metadataCounters?.itemCount && metadataCounters.itemCount > 0 ? <span className={styles.metadataCounter} aria-label={`${metadataCounters.itemCount} ${metadataCounters.itemCount === 1 ? 'item' : 'items'}`}><i className="bi bi-list-ul" aria-hidden="true" /> {metadataCounters.itemCount}</span> : null}
                {metadataCounters?.shareCount && metadataCounters.shareCount > 0 ? <span className={styles.metadataCounter} aria-label={`${metadataCounters.shareCount} ${metadataCounters.shareCount === 1 ? 'share' : 'shares'}`}><i className="bi bi-people" aria-hidden="true" /> {metadataCounters.shareCount}</span> : null}
              </span>
            </span>
          </span>
          <span className={`${styles.trailing} d-flex flex-column align-items-end gap-1`}>
            <strong className={`${styles.amount} ${styles[`amount--${item.direction}`] ?? ''}`}>
              <FinancialAmountView formattedAmount={item.amountLabel} sign={item.amountSign || undefined} tone={item.direction === 'income' ? 'income' : item.direction === 'expense' ? 'expense' : undefined} visibility={amountVisibility ?? 'visible'} />
            </strong>
            {trailingMetadata ? <span className={styles.trailingMetadata}>{trailingMetadata}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}
