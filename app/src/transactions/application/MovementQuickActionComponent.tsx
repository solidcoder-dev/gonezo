import { useMemo } from 'react';
import { FloatingActionButtonView } from '../../shared/ui/FloatingActionButton/FloatingActionButtonView';
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
    </>
  );
}
