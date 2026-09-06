import type { ViewProps } from '../../../shared/ui/ViewProps';
import styles from './MovementMoreTriggerView.module.css';

export type MovementMoreTriggerViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    open: () => void;
  }
>;

export function MovementMoreTriggerView({ required, provided }: MovementMoreTriggerViewProps) {
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={provided.commands.open}
      disabled={required.status.disabled}
    >
      <span className={styles.text}>
        <strong>More</strong>
        <small>Advanced actions</small>
      </span>
      <i className={`bi bi-chevron-right ${styles.chevron}`} aria-hidden />
    </button>
  );
}
