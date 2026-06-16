import { SelectChipView } from '../../../shared/ui/SelectChip/SelectChipView';
import { SheetView } from '../../../shared/ui/SheetView';
import type { TransactionType } from '../../application/transactions.types';
import type { MovementDraftPickerViewProps } from './MovementDraftPickerView.contract';
import './MovementDraftPickerView.css';

export type { MovementDraftPickerViewProps } from './MovementDraftPickerView.contract';

const MOVEMENT_TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

function compactAccountName(accountName: string): string {
  const normalizedAccountName = accountName.trim();
  return normalizedAccountName.length > 11
    ? `${normalizedAccountName.slice(0, 8)}...`
    : normalizedAccountName;
}

export function MovementDraftPickerView({ required, provided }: MovementDraftPickerViewProps) {
  const accountName = required.state.accountName.trim();
  const movementTypeLabel = MOVEMENT_TYPE_LABELS[required.state.movementType];

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'New movement draft',
          panelClassName: 'movement-draft-picker-panel',
          showHandle: true,
          dragUpToExpand: true,
          dragSurface: 'panel',
          closeOnBackdrop: true,
          contentClassName: 'movement-draft-picker-content',
        },
        data: {
          body: (
            <>
              <h3 className="movement-draft-picker-title">New movement</h3>
              <div className="movement-draft-picker-chips">
                <SelectChipView
                  required={{
                    config: {
                      label: compactAccountName(accountName),
                      ariaLabel: `Choose account: ${accountName}`,
                      open: required.state.accountSelectorOpen,
                    },
                    data: {},
                    state: {},
                    status: { disabled: required.status.disabled },
                  }}
                  provided={{ commands: { press: provided.commands.toggleAccountSelector } }}
                />
                <SelectChipView
                  required={{
                    config: {
                      label: movementTypeLabel,
                      ariaLabel: `Choose movement type: ${movementTypeLabel}`,
                      open: required.state.typeSelectorOpen,
                      tone: required.state.movementType,
                    },
                    data: {},
                    state: {},
                    status: { disabled: required.status.disabled },
                  }}
                  provided={{ commands: { press: provided.commands.toggleTypeSelector } }}
                />
              </div>
              <p className="movement-draft-picker-hint">Drag up to continue</p>
            </>
          ),
        },
        state: { open: required.state.open },
        status: { disabled: required.status.disabled },
      }}
      provided={{ commands: { close: provided.commands.close, expand: provided.commands.expand } }}
    />
  );
}
