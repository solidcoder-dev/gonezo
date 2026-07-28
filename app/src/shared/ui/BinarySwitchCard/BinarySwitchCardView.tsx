import type { ViewProps } from '../ViewProps';
import styles from './BinarySwitchCardView.module.css';

export type BinarySwitchCardViewProps = ViewProps<
  {
    switchId: string;
    title: string;
    description?: string;
    iconClassName?: string;
    ariaLabel: string;
  },
  Record<string, never>,
  {
    value: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    setValue: (value: boolean) => void;
  }
>;

export function BinarySwitchCardView({ required, provided }: BinarySwitchCardViewProps) {
  const checked = required.state.value;

  return (
    <div className={styles.card}>
      {required.config.iconClassName ? (
        <span className={styles.icon}>
          <i className={required.config.iconClassName} aria-hidden />
        </span>
      ) : null}
      <span className={styles.text}>
        <strong className={styles.title}>{required.config.title}</strong>
        {required.config.description ? <small className={styles.description}>{required.config.description}</small> : null}
      </span>
      <button
        type="button"
        className={styles.switch}
        id={required.config.switchId}
        role="switch"
        aria-label={required.config.ariaLabel}
        aria-checked={checked}
        disabled={required.status.disabled}
        onClick={() => provided.commands.setValue(!checked)}
      />
    </div>
  );
}
