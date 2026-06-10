import type { ViewProps } from '../../../shared/ui/ViewProps';
import './TransactionComposerActionsView.css';

export type TransactionComposerActionsViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    splitReady: boolean;
    expectedAvailable: boolean;
    expected: boolean;
    editingScheduledMovement: boolean;
    postExpectedMovement: boolean;
  },
  {
    disabled?: boolean;
  },
  Record<string, never>
>;

function submitLabel(state: TransactionComposerActionsViewProps['required']['state']): string {
  if (state.postExpectedMovement) {
    return 'Post movement';
  }
  if (state.editingScheduledMovement) {
    return 'Update scheduled';
  }
  if (state.expectedAvailable && state.expected) {
    return 'Save expected';
  }
  if (state.expectedAvailable) {
    return 'Post now';
  }
  return 'Save';
}

export function TransactionComposerActionsView({ required }: TransactionComposerActionsViewProps) {
  const disabled = required.status.disabled || !required.state.splitReady;
  const showExpectedAction = required.state.expectedAvailable
    && !required.state.editingScheduledMovement
    && !required.state.postExpectedMovement
    && !required.state.expected;
  const primaryIntent = required.state.expected ? 'expected' : 'post';

  return (
    <div className="composer-actions">
      <button
        type="submit"
        name="transactionIntent"
        value={primaryIntent}
        className="primary-cta"
        disabled={disabled}
      >
        {submitLabel(required.state)}
      </button>
      {showExpectedAction ? (
        <button
          type="submit"
          name="transactionIntent"
          value="expected"
          className="composer-secondary-cta"
          disabled={disabled}
        >
          Save expected
        </button>
      ) : null}
    </div>
  );
}
