import { SplitFloatingActionView } from '../../../shared/ui/SplitFloatingAction/SplitFloatingActionView';
import type { MovementQuickActionViewProps } from './MovementQuickActionView.contract';

export type { MovementQuickActionViewProps } from './MovementQuickActionView.contract';

const VISIBLE_ACCOUNT_NAME_LENGTH = 8;
const MAX_ACCOUNT_NAME_LENGTH = VISIBLE_ACCOUNT_NAME_LENGTH + 3;

function getCompactAccountName(accountName: string): string {
  const normalizedAccountName = accountName.trim();

  if (normalizedAccountName.length <= MAX_ACCOUNT_NAME_LENGTH) {
    return normalizedAccountName;
  }

  return `${normalizedAccountName.slice(0, VISIBLE_ACCOUNT_NAME_LENGTH)}...`;
}

export function MovementQuickActionView({ required, provided }: MovementQuickActionViewProps) {
  const accountName = required.state.accountName.trim();

  return (
    <SplitFloatingActionView
      required={{
        config: {
          ariaLabel: 'New movement action',
          primaryLabel: 'Add movement',
          secondaryLabel: getCompactAccountName(accountName),
          primaryAriaLabel: 'Add movement',
          secondaryAriaLabel: `Choose account for new movement: ${accountName}`,
          open: required.state.selectorOpen,
        },
        data: {
          primaryContent: <i className="bi bi-plus-circle" aria-hidden data-testid="movement-quick-action-icon" />,
        },
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
