import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementDraftPickerView } from './MovementDraftPickerView';

describe('MovementDraftPickerView', () => {
  it('renders balanced account and movement type chips with semantic movement tone', () => {
    render(
      <MovementDraftPickerView
        required={{
          state: {
            open: true,
            accountName: 'Main family wallet',
            movementType: 'income',
            accountSelectorOpen: false,
            typeSelectorOpen: false,
          },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            close: vi.fn(),
            expand: vi.fn(),
            toggleAccountSelector: vi.fn(),
            toggleTypeSelector: vi.fn(),
          },
        }}
      />,
    );

    const draft = screen.getByRole('dialog', { name: 'New movement draft' });
    expect(draft.querySelector('.movement-draft-picker-chips')).toBeInTheDocument();
    expect(within(draft).getByRole('button', { name: 'Choose account: Main family wallet' })).toHaveTextContent('Main fam...');
    expect(within(draft).getByRole('button', { name: 'Choose movement type: Income' })).toHaveClass('select-chip--income');
  });
});
