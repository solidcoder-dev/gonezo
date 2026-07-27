import type { OverviewStarterItemView as OverviewStarterItem } from './OverviewStartersView.contract';
import styles from './OverviewStartersView.module.css';

const iconClassByKey: Record<OverviewStarterItem['icon'], string> = {
  expense: 'bi bi-bag',
  income: 'bi bi-briefcase',
  tag: 'bi bi-tag',
  sharing: 'bi bi-people',
  recurring: 'bi bi-arrow-repeat',
  transfer: 'bi bi-arrow-left-right',
};

export function OverviewStarterItemView({ item }: { item: OverviewStarterItem }) {
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
