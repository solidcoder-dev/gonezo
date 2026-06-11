import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPickerField } from './CategoryPickerField';

const options = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Bills' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Groceries' },
  { id: '00000000-0000-4000-8000-000000000103', name: 'Dining' },
  { id: '00000000-0000-4000-8000-000000000104', name: 'Transport' },
  { id: '00000000-0000-4000-8000-000000000105', name: 'Health' },
  { id: '00000000-0000-4000-8000-000000000106', name: 'Shopping' },
  { id: '00000000-0000-4000-8000-000000000108', name: 'Travel' },
];

describe('CategoryPickerField', () => {
  it('expands hidden categories inline with three dots', () => {
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
    expect(screen.getByRole('button', { name: 'Select category Health' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Select category Shopping' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more categories' }));

    expect(screen.getByRole('button', { name: 'Select category Shopping' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer categories' })).toBeInTheDocument();
  });

  it('keeps category order stable when one is selected', () => {
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
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Select category Bills' }));

    expect(onSelect).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101');
  });

  it('keeps a selected hidden category visible while collapsed', () => {
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
            '00000000-0000-4000-8000-000000000105',
            '00000000-0000-4000-8000-000000000106',
            '00000000-0000-4000-8000-000000000108',
          ],
          disabled: false,
        }}
        provided={{ onSelect: vi.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select category Travel' })).toHaveTextContent('Travel');
  });
});
