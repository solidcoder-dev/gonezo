import styles from './HomeMovementListView.module.css';

export type HomeMovementRowView = {
  id: string;
  title: string;
  subtitle: string;
  iconClassName: string;
  amountLabel: string;
  amountTone: 'income' | 'expense' | 'transfer' | 'expected';
};

export type HomeMovementListViewProps = {
  ariaLabel: string;
  movements: HomeMovementRowView[];
  disabled?: boolean;
  selectMovement: (movementId: string) => void;
};

export function HomeMovementListView({
  ariaLabel,
  movements,
  disabled,
  selectMovement,
}: HomeMovementListViewProps) {
  return (
    <ul className={styles.list} aria-label={ariaLabel}>
      {movements.map((movement) => (
        <li className={styles.item} key={movement.id}>
          <button
            type="button"
            className={styles.itemButton}
            onClick={() => selectMovement(movement.id)}
            disabled={disabled}
          >
            <span className={styles.icon} aria-hidden>
              <i className={movement.iconClassName} />
            </span>
            <span className={styles.text}>
              <strong>{movement.title}</strong>
              <span>{movement.subtitle}</span>
            </span>
            <strong className={`${styles.amount} ${styles[movement.amountTone]}`}>{movement.amountLabel}</strong>
            <i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
