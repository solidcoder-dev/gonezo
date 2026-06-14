import { useMemo } from 'react';
import { MovementAccountSelectorView } from '../ui/MovementAccountSelector/MovementAccountSelectorView';
import { MovementQuickActionView } from '../ui/MovementQuickAction/MovementQuickActionView';
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
    events: provided.events,
  });

  if (!required.config.enabled || model.required.state.accounts.length === 0) {
    return null;
  }

  return (
    <>
      <MovementQuickActionView
        required={{
          state: {
            accountName: model.required.state.selectedAccountName,
            selectorOpen: model.required.state.accountSelectorOpen,
          },
          status: {
            disabled: model.required.status.disabled,
          },
        }}
        provided={{
          commands: {
            createMovement: model.provided.commands.createMovement,
            toggleAccountSelector: model.provided.commands.toggleAccountSelector,
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
    </>
  );
}
