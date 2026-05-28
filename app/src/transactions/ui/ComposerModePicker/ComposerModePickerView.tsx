import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ComposerMode } from '../TransactionComposer/TransactionComposerView';

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

const MODES: Array<{ value: SelectableComposerMode; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

export function ComposerModePickerView({ required, provided }: ComposerModePickerViewProps) {
  return (
    <div className="stack">
      {MODES.map((mode) => (
        <div key={mode.value} className="mode-row">
          <button
            type="button"
            onClick={() => provided.commands.selectMode(mode.value)}
            disabled={required.status.disabled}
          >
            {mode.label}
          </button>
        </div>
      ))}
    </div>
  );
}
