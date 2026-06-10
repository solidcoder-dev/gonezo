import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionComposerActionsView } from './TransactionComposerActionsView';

describe('TransactionComposerActionsView', () => {
  it('renders post and expected submit actions when expected is available', () => {
    render(
      <TransactionComposerActionsView
        required={{
          config: {},
          data: {},
          state: {
            splitReady: true,
            expectedAvailable: true,
            expected: false,
            editingScheduledMovement: false,
            postExpectedMovement: false,
          },
          status: { disabled: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Post now' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save expected' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save expected' })).toHaveClass('composer-secondary-cta');
  });

  it('renders a single save expected action when editing an expected movement', () => {
    render(
      <TransactionComposerActionsView
        required={{
          config: {},
          data: {},
          state: {
            splitReady: true,
            expectedAvailable: true,
            expected: true,
            editingScheduledMovement: false,
            postExpectedMovement: false,
          },
          status: { disabled: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Save expected' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Post now' })).not.toBeInTheDocument();
  });

  it('prioritizes post/edit labels and disables when split is not ready', () => {
    const { rerender } = render(
      <TransactionComposerActionsView
        required={{
          config: {},
          data: {},
          state: {
            splitReady: false,
            expectedAvailable: true,
            expected: true,
            editingScheduledMovement: false,
            postExpectedMovement: true,
          },
          status: { disabled: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Post movement' })).toBeDisabled();

    rerender(
      <TransactionComposerActionsView
        required={{
          config: {},
          data: {},
          state: {
            splitReady: true,
            expectedAvailable: false,
            expected: false,
            editingScheduledMovement: true,
            postExpectedMovement: false,
          },
          status: { disabled: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Update scheduled' })).toBeEnabled();
  });
});
