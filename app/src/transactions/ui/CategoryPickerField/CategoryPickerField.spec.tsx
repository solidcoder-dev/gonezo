import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPickerField } from './CategoryPickerField';

const options = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Bills' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Groceries' },
  { id: '00000000-0000-4000-8000-000000000103', name: 'Dining' },
  { id: '00000000-0000-4000-8000-000000000104', name: 'Transport' },
  { id: '00000000-0000-4000-8000-000000000110', name: 'Beauty' },
  { id: '00000000-0000-4000-8000-000000000108', name: 'Travel' },
];

describe('CategoryPickerField', () => {
  it('renders all categories as a horizontal chip list with names', () => {
    const onSelect = vi.fn();

    render(
      <CategoryPickerField
        required={{
          selectedCategoryId: '',
          options,
          frequentCategoryIds: [
            '00000000-0000-4000-8000-000000000101',
            '00000000-0000-4000-8000-000000000102',
            '00000000-0000-4000-8000-000000000103',
            '00000000-0000-4000-8000-000000000104',
            '00000000-0000-4000-8000-000000000105',
            '00000000-0000-4000-8000-000000000106',
            '00000000-0000-4000-8000-000000000108',
          ],
          disabled: false,
        }}
        provided={{ onSelect }}
      />,
    );

    expect(screen.queryByRole('textbox', { name: 'Category' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select category Beauty' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select category Travel' })).toHaveTextContent('Travel');
    expect(screen.queryByRole('button', { name: 'Show more categories' })).not.toBeInTheDocument();
  });

  it('keeps the provided category order when one is selected', () => {
    const onSelect = vi.fn();

    render(
      <CategoryPickerField
        required={{
          selectedCategoryId: '00000000-0000-4000-8000-000000000102',
          options,
          frequentCategoryIds: ['00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103'],
          disabled: false,
        }}
        provided={{ onSelect }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select category Groceries' })).toHaveTextContent('Groceries');
    const categoryButtons = screen.getAllByRole('button', { name: /Select category/ });
    expect(categoryButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Select category Bills',
      'Select category Groceries',
      'Select category Dining',
      'Select category Transport',
      'Select category Beauty',
      'Select category Travel',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Select category Bills' }));

    expect(onSelect).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101');
  });

  it('keeps a selected category highlighted in the horizontal list', () => {
    render(
      <CategoryPickerField
        required={{
          selectedCategoryId: '00000000-0000-4000-8000-000000000108',
          options,
          frequentCategoryIds: [
            '00000000-0000-4000-8000-000000000101',
            '00000000-0000-4000-8000-000000000102',
            '00000000-0000-4000-8000-000000000103',
            '00000000-0000-4000-8000-000000000104',
            '00000000-0000-4000-8000-000000000110',
            '00000000-0000-4000-8000-000000000108',
          ],
          disabled: false,
        }}
        provided={{ onSelect: vi.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select category Travel' })).toHaveTextContent('Travel');
    expect(screen.getByRole('button', { name: 'Select category Travel' })).toHaveClass('selected');
  });
});
