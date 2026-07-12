import type { ViewProps } from '../ViewProps';
import './BinarySwitchCardView.css';

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
  return (
    <label className="binary-switch-card" htmlFor={required.config.switchId}>
      {required.config.iconClassName ? (
        <span className="binary-switch-card__icon">
          <i className={required.config.iconClassName} aria-hidden />
        </span>
      ) : null}
      <span className="binary-switch-card__text">
        <strong>{required.config.title}</strong>
        {required.config.description ? <small>{required.config.description}</small> : null}
      </span>
      <input
        id={required.config.switchId}
        type="checkbox"
        role="switch"
        aria-label={required.config.ariaLabel}
        checked={required.state.value}
        disabled={required.status.disabled}
        onChange={(event) => provided.commands.setValue(event.currentTarget.checked)}
      />
    </label>
  );
}
