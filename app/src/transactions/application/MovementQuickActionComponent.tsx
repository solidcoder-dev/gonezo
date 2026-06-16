import { useMemo } from 'react';
import { FloatingActionButtonView } from '../../shared/ui/FloatingActionButton/FloatingActionButtonView';
import { MovementDraftPickerView } from '../ui/MovementDraftPicker/MovementDraftPickerView';
import { MovementAccountSelectorView } from '../ui/MovementAccountSelector/MovementAccountSelectorView';
import { MovementTypeSelectorView } from '../ui/MovementTypeSelector/MovementTypeSelectorView';
import type { MovementQuickActionComponentProps } from './MovementQuickActionComponent.contract';
import { useMovementQuickActionModel } from './useMovementQuickActionModel';

export type {
  MovementQuickActionComponentPort,
  MovementQuickActionComponentProps,
  MovementQuickActionComponentProvided,
  MovementQuickActionComponentRequired,
} from './MovementQuickActionComponent.contract';

export function MovementQuickActionComponent({ required, provided = {} }: MovementQuickActionComponentProps) {
  const ports = useMemo(() => ({
    ledger: required.context.core,
    preferences: required.context.core,
  }), [required.context.core]);
  const model = useMovementQuickActionModel({
    ports,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    draftRequest: required.config.draftRequest,
    events: provided.events,
  });

  if (!required.config.enabled || model.required.state.accounts.length === 0) {
    return null;
  }

  return (
    <>
      <FloatingActionButtonView
        required={{
          config: {
            ariaLabel: 'Add movement',
            iconClassName: 'bi bi-plus-lg',
          },
          data: {},
          state: {},
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            press: model.provided.commands.openDraft,
          },
        }}
      />
      <MovementDraftPickerView
        required={{
          state: {
            open: model.required.state.draftOpen,
            accountName: model.required.state.selectedAccountName,
            movementType: model.required.state.selectedMovementType,
            accountSelectorOpen: model.required.state.accountSelectorOpen,
            typeSelectorOpen: model.required.state.typeSelectorOpen,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeDraft,
            expand: model.provided.commands.expandDraft,
            toggleAccountSelector: model.provided.commands.toggleAccountSelector,
            toggleTypeSelector: model.provided.commands.toggleTypeSelector,
          },
        }}
      />
      <MovementAccountSelectorView
        required={{
          data: {
            accounts: model.required.state.accounts,
          },
          state: {
            open: model.required.state.accountSelectorOpen,
            selectedAccountId: model.required.state.selectedAccountId,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeAccountSelector,
            selectAccount: model.provided.commands.selectAccount,
          },
        }}
      />
      <MovementTypeSelectorView
        required={{
          state: {
            open: model.required.state.typeSelectorOpen,
            selectedType: model.required.state.selectedMovementType,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            close: model.provided.commands.closeTypeSelector,
            selectType: model.provided.commands.selectMovementType,
          },
        }}
      />
    </>
  );
}
