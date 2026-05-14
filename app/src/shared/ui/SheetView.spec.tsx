import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SheetView } from './SheetView';

describe('SheetView', () => {
  it('renders a dialog with header, body and footer when open', () => {
    render(
      <SheetView
        required={{
          config: {
            ariaLabel: 'Import backup',
            title: 'Import backup',
            closeLabel: 'Close import backup',
          },
          data: {
            body: <p>Choose a file</p>,
            footer: <button type="button">Import</button>,
          },
          state: { open: true },
          status: { disabled: false },
        }}
        provided={{ commands: { close: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Import backup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import backup' })).toBeInTheDocument();
    expect(screen.getByText('Choose a file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close import backup' })).toBeInTheDocument();
  });

  it('closes on backdrop click but not on panel click', () => {
    const close = vi.fn();
    render(
      <SheetView
        required={{
          config: { ariaLabel: 'Sheet', title: 'Sheet' },
          data: { body: <p>Content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close } }}
      />,
    );

    fireEvent.click(screen.getByRole('dialog', { name: 'Sheet' }));
    expect(close).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <SheetView
        required={{
          config: { ariaLabel: 'Closed sheet' },
          data: { body: <p>Hidden</p> },
          state: { open: false },
          status: {},
        }}
        provided={{ commands: { close: vi.fn() } }}
      />,
    );

    expect(screen.queryByRole('dialog', { name: 'Closed sheet' })).not.toBeInTheDocument();
  });
});
