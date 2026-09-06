import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementReuseConfirmationView } from './MovementReuseConfirmationView';

function renderConfirmation(itemCount: number, shareCount: number) {
  return render(<MovementReuseConfirmationView
    itemCount={itemCount}
    shareCount={shareCount}
    historicalAmount="53.40"
    onSetupOnly={vi.fn()}
    onReuseDetails={vi.fn()}
    onCancel={vi.fn()}
  />);
}

describe('MovementReuseConfirmationView', () => {
  it.each([
    [2, 0, '2 items'],
    [0, 2, '2 shares'],
    [2, 2, '2 items · 2 shares'],
  ])('summarizes %s items and %s shares', (itemCount, shareCount, summary) => {
    renderConfirmation(itemCount, shareCount);

    expect(screen.getByRole('dialog', { name: 'Reuse movement details?' })).toHaveTextContent(summary);
    expect(screen.getByRole('dialog')).toHaveTextContent('53.40');
  });

  it('exposes semantic actions and closes through cancel', () => {
    const onSetupOnly = vi.fn();
    const onReuseDetails = vi.fn();
    const onCancel = vi.fn();
    render(<MovementReuseConfirmationView itemCount={1} shareCount={0} historicalAmount="20.00" onSetupOnly={onSetupOnly} onReuseDetails={onReuseDetails} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Setup only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reuse details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSetupOnly).toHaveBeenCalledOnce();
    expect(onReuseDetails).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
