import { useState } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import type { OverviewStartersViewProps } from './OverviewStartersView.contract';
import { OverviewStarterItemView } from './OverviewStarterItemView';
import styles from './OverviewStartersView.module.css';

export function OverviewStartersView({ required }: OverviewStartersViewProps) {
  const [allOpen, setAllOpen] = useState(false);
  const { allItems, previewItems } = required.data;
  const config = required.config;
  const canSeeAll = allItems.length > previewItems.length;

  return (
    <section className={styles.section} aria-label={config?.ariaLabel ?? 'Overview starters'} aria-busy={required.status.loading}>
      <header className={styles.header}>
        <h2>{config?.title ?? 'Starters'}</h2>
        {canSeeAll ? <button type="button" className={styles.seeAllButton} onClick={() => setAllOpen(true)}>See all</button> : null}
      </header>

      {required.status.loading ? (
        <div className={styles.skeletonGrid} role="status" aria-label={config?.loadingLabel ?? 'Loading overview starters'}>
          {Array.from({ length: 4 }, (_, index) => <span className={styles.skeletonItem} key={index} />)}
        </div>
      ) : previewItems.length > 0 ? (
        <ul className={styles.grid}>
          {previewItems.map((item) => <OverviewStarterItemView item={item} key={item.key} />)}
        </ul>
      ) : (
        <p className={styles.emptyState}>{config?.emptyLabel ?? 'No starter insights for this period.'}</p>
      )}

      <SheetView
        required={{
          config: { ariaLabel: `All ${config?.title?.toLowerCase() ?? 'overview starters'}`, title: config?.sheetTitle ?? config?.title ?? 'Starters', closeLabel: `Close ${config?.title?.toLowerCase() ?? 'starters'}`, contentClassName: styles.sheetContent },
          data: { body: <ul className={styles.allItems}>{allItems.map((item) => <OverviewStarterItemView item={item} key={item.key} />)}</ul> },
          state: { open: allOpen },
          status: {},
        }}
        provided={{ commands: { close: () => setAllOpen(false) } }}
      />
    </section>
  );
}

export type { OverviewStarterItemView, OverviewStartersViewProps } from './OverviewStartersView.contract';
