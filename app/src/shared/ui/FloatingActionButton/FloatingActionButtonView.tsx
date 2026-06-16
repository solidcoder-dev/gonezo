import type { FloatingActionButtonViewProps } from './FloatingActionButtonView.contract';
import './FloatingActionButtonView.css';

export type { FloatingActionButtonViewProps } from './FloatingActionButtonView.contract';

export function FloatingActionButtonView({ required, provided }: FloatingActionButtonViewProps) {
  return (
    <button
      type="button"
      className="floating-action-button"
      aria-label={required.config.ariaLabel}
      disabled={required.status.disabled}
      onClick={provided.commands.press}
    >
      <i className={required.config.iconClassName} aria-hidden />
    </button>
  );
}
