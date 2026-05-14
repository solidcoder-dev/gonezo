import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatalistFieldView } from './DatalistFieldView';

describe('DatalistFieldView', () => {
  it('renders a configured datalist field and reports changes', () => {
    const change = vi.fn();
    const { container } = render(
      <DatalistFieldView
        required={{
          config: {
            label: 'Category',
            placeholder: 'Choose or type a category (optional)',
            hint: 'Suggestions include all categories',
          },
          data: {
            options: [
              { id: 'cat-food', value: 'Food' },
              { id: 'cat-rent', value: 'Rent' },
            ],
          },
          state: { value: 'Foo' },
          status: { disabled: false },
        }}
        provided={{ commands: { change } }}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Category' });
    expect(input).toHaveValue('Foo');
    expect(input).toHaveAttribute('placeholder', 'Choose or type a category (optional)');
    expect(screen.getByText('Suggestions include all categories')).toBeInTheDocument();

    const listId = input.getAttribute('list');
    expect(listId).toBeTruthy();
    const options = Array.from(container.querySelectorAll(`#${CSS.escape(listId ?? '')} option`));
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['Food', 'Rent']);

    fireEvent.change(input, { target: { value: 'Fuel' } });
    expect(change).toHaveBeenCalledWith('Fuel');
  });

  it('disables the input from status', () => {
    render(
      <DatalistFieldView
        required={{
          config: { label: 'Tags' },
          data: { options: [] },
          state: { value: '' },
          status: { disabled: true },
        }}
        provided={{ commands: { change: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Tags' })).toBeDisabled();
  });
});
