import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SplitFloatingActionView } from './SplitFloatingActionView';

describe('SplitFloatingActionView', () => {
  it('renders a single split floating action with primary and secondary zones', () => {
    const primary = vi.fn();
    const secondary = vi.fn();

    render(
      <SplitFloatingActionView
        required={{
          config: {
            ariaLabel: 'New item action',
            primaryLabel: '+ Item',
            secondaryLabel: 'Main wallet',
            primaryAriaLabel: 'Create item',
            secondaryAriaLabel: 'Choose context',
            open: false,
          },
          data: {},
          state: {},
          status: { disabled: false },
        }}
        provided={{ commands: { primary, secondary } }}
      />,
    );

    expect(screen.getByRole('group', { name: 'New item action' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose context' }));

    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Main wallet')).toHaveClass('split-floating-action-secondary-label');
    expect(screen.getByTestId('split-floating-action-chevron')).toHaveClass('bi-chevron-down');
  });

  it('renders custom primary content while keeping the accessible primary label', () => {
    const primaryContent: ReactNode = <i className="bi bi-plus-circle" aria-hidden data-testid="primary-icon" />;

    render(
      <SplitFloatingActionView
        required={{
          config: {
            ariaLabel: 'New movement action',
            primaryLabel: 'Add movement',
            secondaryLabel: 'billetera',
          },
          data: { primaryContent },
          state: {},
          status: { disabled: false },
        }}
        provided={{ commands: { primary: vi.fn(), secondary: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Add movement' })).toBeInTheDocument();
    expect(screen.getByTestId('primary-icon')).toHaveClass('bi-plus-circle');
    expect(screen.queryByText('Add movement')).not.toBeInTheDocument();
  });

  it('shows open state and prevents interaction while disabled', () => {
    const primary = vi.fn();
    const secondary = vi.fn();

    render(
      <SplitFloatingActionView
        required={{
          config: {
            ariaLabel: 'New item action',
            primaryLabel: '+ Item',
            secondaryLabel: 'Main wallet with a very long display name',
            open: true,
          },
          data: {},
          state: {},
          status: { disabled: true },
        }}
        provided={{ commands: { primary, secondary } }}
      />,
    );

    expect(screen.getByTestId('split-floating-action-chevron')).toHaveClass('bi-chevron-up');
    fireEvent.click(screen.getByRole('button', { name: '+ Item' }));
    fireEvent.click(screen.getByRole('button', { name: /Main wallet/ }));

    expect(primary).not.toHaveBeenCalled();
    expect(secondary).not.toHaveBeenCalled();
  });
});
