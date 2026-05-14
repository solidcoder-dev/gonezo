import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementSectionView } from './MovementSectionView';

describe('MovementSectionView', () => {
  it('renders a collapsed section trigger and hides body', () => {
    const toggle = vi.fn();
    render(
      <MovementSectionView
        required={{
          config: {
            ariaLabel: 'Expected movements',
            title: 'Expected',
            toggleLabel: 'expected movements',
          },
          data: {
            count: 2,
            body: <p>Expected rows</p>,
          },
          state: {
            collapsible: true,
            expanded: false,
          },
          status: { disabled: false },
        }}
        provided={{ commands: { toggle } }}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Expand expected movements (2)' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Expected rows')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('renders non-collapsible content with an inline header', () => {
    render(
      <MovementSectionView
        required={{
          config: {
            ariaLabel: 'Posted movements',
            title: 'Posted',
          },
          data: {
            count: 4,
            body: <p>Posted rows</p>,
          },
          state: {
            collapsible: false,
            expanded: true,
          },
          status: { disabled: false },
        }}
        provided={{ commands: {} }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Posted' })).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Posted rows')).toBeInTheDocument();
  });
});
