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

  it('renders a handle without a close button when configured as a bottom sheet', () => {
    render(
      <SheetView
        required={{
          config: { ariaLabel: 'Composer', showHandle: true },
          data: { body: <p>Content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Composer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('closes a draggable sheet when pulled down beyond the threshold', () => {
    const close = vi.fn();
    render(
      <SheetView
        required={{
          config: { ariaLabel: 'Composer', showHandle: true, dragToClose: true },
          data: { body: <p>Content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close } }}
      />,
    );

    const handle = screen.getByTestId('sheet-drag-handle');
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientY: 150, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(handle, { clientY: 150, pointerId: 1, pointerType: 'touch' });
    expect(close).not.toHaveBeenCalled();

    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(handle, { clientY: 260, pointerId: 1, pointerType: 'touch' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('collapses instead of closing when drag down collapse is configured', () => {
    const close = vi.fn();
    const collapse = vi.fn();
    render(
      <SheetView
        required={{
          config: { ariaLabel: 'Composer', showHandle: true, dragDownToCollapse: true },
          data: { body: <p>Content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close, collapse } }}
      />,
    );

    const handle = screen.getByTestId('sheet-drag-handle');
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(handle, { clientY: 260, pointerId: 1, pointerType: 'touch' });

    expect(collapse).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('supports dragging from the whole panel when panel drag surface is configured', () => {
    const expand = vi.fn();
    render(
      <SheetView
        required={{
          config: {
            ariaLabel: 'Draft',
            showHandle: true,
            dragUpToExpand: true,
            dragSurface: 'panel',
          },
          data: { body: <p>Drag surface</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: vi.fn(), expand } }}
      />,
    );

    const panel = screen.getByRole('dialog', { name: 'Draft' });
    fireEvent.pointerDown(panel, { clientY: 320, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(panel, { clientY: 240, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(panel, { clientY: 240, pointerId: 1, pointerType: 'touch' });

    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('supports dragging from non-interactive panel content', () => {
    const expand = vi.fn();
    render(
      <SheetView
        required={{
          config: {
            ariaLabel: 'Draft',
            showHandle: true,
            dragUpToExpand: true,
            dragSurface: 'panel',
          },
          data: { body: <p>Drag from content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: vi.fn(), expand } }}
      />,
    );

    const content = screen.getByText('Drag from content');
    fireEvent.pointerDown(content, { clientY: 320, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(content, { clientY: 240, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(content, { clientY: 240, pointerId: 1, pointerType: 'touch' });

    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('does not visually drag until the gesture passes the activation threshold', () => {
    render(
      <SheetView
        required={{
          config: {
            ariaLabel: 'Composer',
            showHandle: true,
            dragDownToCollapse: true,
            dragSurface: 'panel',
          },
          data: { body: <p>Content</p> },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: vi.fn(), collapse: vi.fn() } }}
      />,
    );

    const panel = screen.getByRole('dialog', { name: 'Composer' });
    fireEvent.pointerDown(panel, { clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(panel, { clientY: 108, pointerId: 1, pointerType: 'touch' });

    expect(panel).not.toHaveStyle({ transform: 'translateY(8px)' });
  });

  it('does not start panel dragging from interactive controls', () => {
    const collapse = vi.fn();
    render(
      <SheetView
        required={{
          config: {
            ariaLabel: 'Composer',
            showHandle: true,
            dragDownToCollapse: true,
            dragSurface: 'panel',
          },
          data: {
            body: (
              <label>
                Amount
                <input aria-label="Amount" />
              </label>
            ),
          },
          state: { open: true },
          status: {},
        }}
        provided={{ commands: { close: vi.fn(), collapse } }}
      />,
    );

    const input = screen.getByLabelText('Amount');
    fireEvent.pointerDown(input, { clientY: 100, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(input, { clientY: 220, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(input, { clientY: 220, pointerId: 1, pointerType: 'touch' });

    expect(collapse).not.toHaveBeenCalled();
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
