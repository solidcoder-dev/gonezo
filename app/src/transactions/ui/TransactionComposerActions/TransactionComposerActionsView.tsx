import type { ViewProps } from '../../../shared/ui/ViewProps';

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
  return 'Save';
}

export function TransactionComposerActionsView({ required }: TransactionComposerActionsViewProps) {
  return (
    <div className="composer-actions">
      <button
        type="submit"
        className="primary-cta"
        disabled={required.status.disabled || !required.state.splitReady}
      >
        {submitLabel(required.state)}
      </button>
    </div>
  );
}
