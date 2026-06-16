import type { SelectChipViewProps } from './SelectChipView.contract';
import './SelectChipView.css';

export type { SelectChipViewProps } from './SelectChipView.contract';

export function SelectChipView({ required, provided }: SelectChipViewProps) {
  const tone = required.config.tone ?? 'neutral';

  return (
    <button
      type="button"
      className={`select-chip select-chip--${tone}`}
      aria-label={required.config.ariaLabel}
      aria-expanded={Boolean(required.config.open)}
      disabled={required.status.disabled}
      onClick={provided.commands.press}
    >
      <span className="select-chip-label">{required.config.label}</span>
      <i className={`bi ${required.config.open ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden />
    </button>
  );
}
