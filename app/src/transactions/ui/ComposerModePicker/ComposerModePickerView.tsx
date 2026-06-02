import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ComposerMode } from '../TransactionComposer/TransactionComposerView';
import './ComposerModePickerView.css';

type SelectableComposerMode = Exclude<ComposerMode, 'picker'>;

export type ComposerModePickerViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    selectMode: (mode: SelectableComposerMode) => void;
  }
>;

const MODES: Array<{ value: SelectableComposerMode; label: string; iconClassName: string }> = [
  { value: 'expense', label: 'Expense', iconClassName: 'bi bi-arrow-down-left' },
  { value: 'income', label: 'Income', iconClassName: 'bi bi-arrow-up-right' },
  { value: 'transfer', label: 'Transfer', iconClassName: 'bi bi-arrow-left-right' },
];

export function ComposerModePickerView({ required, provided }: ComposerModePickerViewProps) {
  return (
    <div className="stack">
      {MODES.map((mode) => (
        <div key={mode.value} className="mode-row">
          <button
            type="button"
            className={`mode-button mode-button--${mode.value}`}
            onClick={() => provided.commands.selectMode(mode.value)}
            disabled={required.status.disabled}
          >
            <i className={mode.iconClassName} aria-hidden />
            {mode.label}
          </button>
        </div>
      ))}
    </div>
  );
}
