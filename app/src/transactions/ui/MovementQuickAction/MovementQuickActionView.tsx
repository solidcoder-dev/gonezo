import { SplitFloatingActionView } from '../../../shared/ui/SplitFloatingAction/SplitFloatingActionView';
import type { MovementQuickActionViewProps } from './MovementQuickActionView.contract';

export type { MovementQuickActionViewProps } from './MovementQuickActionView.contract';

export function MovementQuickActionView({ required, provided }: MovementQuickActionViewProps) {
  return (
    <SplitFloatingActionView
      required={{
        config: {
          ariaLabel: 'New movement action',
          primaryLabel: '+ Movement',
          secondaryLabel: required.state.accountName,
          primaryAriaLabel: 'Add movement',
          secondaryAriaLabel: 'Choose account for new movement',
          open: required.state.selectorOpen,
        },
        data: {},
        state: {},
        status: { disabled: required.status.disabled },
      }}
      provided={{
        commands: {
          primary: provided.commands.createMovement,
          secondary: provided.commands.toggleAccountSelector,
        },
      }}
    />
  );
}
