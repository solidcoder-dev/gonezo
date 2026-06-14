import type { SplitFloatingActionViewProps } from './SplitFloatingActionView.contract';
import './SplitFloatingActionView.css';

export type { SplitFloatingActionViewProps } from './SplitFloatingActionView.contract';

export function SplitFloatingActionView({ required, provided }: SplitFloatingActionViewProps) {
  const { config, data, status } = required;
  const disabled = Boolean(status.disabled);
  const rootClassName = disabled
    ? 'split-floating-action is-disabled'
    : 'split-floating-action';

  return (
    <div className={rootClassName} role="group" aria-label={config.ariaLabel}>
      <button
        type="button"
        className="split-floating-action-zone split-floating-action-primary"
        aria-label={config.primaryAriaLabel ?? config.primaryLabel}
        disabled={disabled}
        onClick={provided.commands.primary}
      >
        {data.primaryContent ?? config.primaryLabel}
      </button>
      <span className="split-floating-action-divider" aria-hidden />
      <button
        type="button"
        className="split-floating-action-zone split-floating-action-secondary"
        aria-label={config.secondaryAriaLabel ?? config.secondaryLabel}
        disabled={disabled}
        aria-expanded={Boolean(config.open)}
        onClick={provided.commands.secondary}
      >
        <span className="split-floating-action-secondary-label">{config.secondaryLabel}</span>
        <i
          className={`bi ${config.open ? 'bi-chevron-up' : 'bi-chevron-down'}`}
          aria-hidden
          data-testid="split-floating-action-chevron"
        />
      </button>
    </div>
  );
}
