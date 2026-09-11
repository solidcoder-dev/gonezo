import type { OverviewStarterItemView as OverviewStarterItem } from './OverviewStartersView.contract';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
import { FinancialAmountView } from '../../../shared/ui/FinancialAmount/FinancialAmountView';
import styles from './OverviewStartersView.module.css';

const iconClassByKey: Record<OverviewStarterItem['icon'], string> = {
  expense: 'bi bi-bag',
  income: 'bi bi-briefcase',
  tag: 'bi bi-tag',
  sharing: 'bi bi-people',
  recurring: 'bi bi-arrow-repeat',
  transfer: 'bi bi-arrow-left-right',
};

export function OverviewStarterItemView({ item, visibility = 'visible' }: { item: OverviewStarterItem; visibility?: AmountVisibility }) {
  return (
    <li className={styles.item}>
      <span className={`${styles.icon} ${styles[`icon${item.tone}`]}`} aria-hidden><i className={iconClassByKey[item.icon]} /></span>
      <div className={styles.itemText}>
        <span className={styles.label}>{item.label}</span>
        <strong className={styles.primaryText}>{item.primaryText}</strong>
        <FinancialAmountView formattedAmount={item.amount} visibility={visibility} className={styles.amount} />
        {item.supportingText ? <span className={styles.supportingText}>{item.supportingText}</span> : null}
      </div>
    </li>
  );
}
