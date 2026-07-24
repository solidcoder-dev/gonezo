import { useState } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import type { OverviewStarterItemView, OverviewStartersViewProps } from './OverviewStartersView.contract';
import styles from './OverviewStartersView.module.css';

const iconClassByKey: Record<OverviewStarterItemView['icon'], string> = {
  expense: 'bi bi-bag',
  income: 'bi bi-briefcase',
  tag: 'bi bi-tag',
  sharing: 'bi bi-people',
  recurring: 'bi bi-arrow-repeat',
  transfer: 'bi bi-arrow-left-right',
};

export function OverviewStartersView({ required }: OverviewStartersViewProps) {
  const [allOpen, setAllOpen] = useState(false);
  const { allItems, previewItems } = required.data;
  const canSeeAll = allItems.length > previewItems.length;

  return (
    <section className={styles.section} aria-label="Overview starters" aria-busy={required.status.loading}>
      <header className={styles.header}>
        <h2>Starters</h2>
        {canSeeAll ? <button type="button" className={styles.seeAllButton} onClick={() => setAllOpen(true)}>See all</button> : null}
      </header>

      {required.status.loading ? (
        <div className={styles.skeletonGrid} role="status" aria-label="Loading overview starters">
          {Array.from({ length: 4 }, (_, index) => <span className={styles.skeletonItem} key={index} />)}
        </div>
      ) : previewItems.length > 0 ? (
        <ul className={styles.grid}>
          {previewItems.map((item) => <StarterItem item={item} key={item.key} />)}
        </ul>
      ) : (
        <p className={styles.emptyState}>No starter insights for this period.</p>
      )}

      <SheetView
        required={{
          config: { ariaLabel: 'All overview starters', title: 'Starters', closeLabel: 'Close starters', contentClassName: styles.sheetContent },
          data: { body: <ul className={styles.allItems}>{allItems.map((item) => <StarterItem item={item} key={item.key} />)}</ul> },
          state: { open: allOpen },
          status: {},
        }}
        provided={{ commands: { close: () => setAllOpen(false) } }}
      />
    </section>
  );
}

function StarterItem({ item }: { item: OverviewStarterItemView }) {
  return (
    <li className={styles.item}>
      <span className={`${styles.icon} ${styles[`icon${item.tone}`]}`} aria-hidden><i className={iconClassByKey[item.icon]} /></span>
      <div className={styles.itemText}>
        <span className={styles.label}>{item.label}</span>
        <strong className={styles.primaryText}>{item.primaryText}</strong>
        <strong className={styles.amount}>{item.amount}</strong>
        {item.supportingText ? <span className={styles.supportingText}>{item.supportingText}</span> : null}
      </div>
    </li>
  );
}

export type { OverviewStarterItemView, OverviewStartersViewProps } from './OverviewStartersView.contract';
