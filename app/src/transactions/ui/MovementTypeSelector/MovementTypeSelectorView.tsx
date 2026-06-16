import { SheetView } from '../../../shared/ui/SheetView';
import type { TransactionType } from '../../application/transactions.types';
import type { MovementTypeSelectorViewProps } from './MovementTypeSelectorView.contract';
import './MovementTypeSelectorView.css';

export type { MovementTypeSelectorViewProps } from './MovementTypeSelectorView.contract';

const MOVEMENT_TYPES: Array<{ value: TransactionType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

function typeButtonLabel(label: string, selected: boolean): string {
  return selected ? `Selected movement type ${label}` : label;
}

export function MovementTypeSelectorView({ required, provided }: MovementTypeSelectorViewProps) {
  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Movement type',
          title: 'Movement type',
          closeLabel: 'Close movement type selector',
          panelClassName: 'import-sheet',
        },
        data: {
          body: (
            <ul className="movement-type-selector-list" aria-label="Movement types">
              {MOVEMENT_TYPES.map((type) => {
                const selected = type.value === required.state.selectedType;
                return (
                  <li key={type.value}>
                    <button
                      type="button"
                      className="movement-type-selector-row"
                      disabled={required.status.disabled}
                      aria-label={typeButtonLabel(type.label, selected)}
                      onClick={() => provided.commands.selectType(type.value)}
                    >
                      <span className="movement-type-selector-check" aria-hidden>
                        {selected ? '✓' : ''}
                      </span>
                      <span className="movement-type-selector-name">{type.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ),
        },
        state: { open: required.state.open },
        status: { disabled: required.status.disabled },
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}
