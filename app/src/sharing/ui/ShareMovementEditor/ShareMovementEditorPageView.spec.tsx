import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareMovementEditorPageView } from './ShareMovementEditorPageView';

describe('ShareMovementEditorPageView', () => {
  it('shows the movement-specific title and returns to the composer', () => {
    const onClose = vi.fn();

    render(
      <ShareMovementEditorPageView
        title="Share income"
        onClose={onClose}
        required={{ config: {}, data: { peopleSuggestions: [] }, state: { amount: '12.00', currencyCode: 'EUR' }, status: {} }}
        provided={{ commands: { applyShare: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('main', { name: 'Share income' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Share income' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
