import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPickerField } from './CategoryPickerField';

const options = [
  { id: 'expense:bills', name: 'Bills' },
  { id: 'expense:groceries', name: 'Groceries' },
  { id: 'expense:dining', name: 'Dining' },
  { id: 'expense:transport', name: 'Transport' },
  { id: 'expense:health', name: 'Health' },
  { id: 'expense:shopping', name: 'Shopping' },
  { id: 'expense:travel', name: 'Travel' },
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
            'expense:bills',
            'expense:groceries',
            'expense:dining',
            'expense:transport',
            'expense:health',
            'expense:shopping',
            'expense:travel',
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
          selectedCategoryId: 'expense:groceries',
          options,
          frequentCategoryIds: ['expense:bills', 'expense:groceries', 'expense:dining'],
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

    expect(onSelect).toHaveBeenCalledWith('expense:bills');
  });

  it('keeps a selected hidden category visible while collapsed', () => {
    render(
      <CategoryPickerField
        required={{
          selectedCategoryId: 'expense:travel',
          options,
          frequentCategoryIds: [
            'expense:bills',
            'expense:groceries',
            'expense:dining',
            'expense:transport',
            'expense:health',
            'expense:shopping',
            'expense:travel',
          ],
          disabled: false,
        }}
        provided={{ onSelect: vi.fn() }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Select category Travel' })).toHaveTextContent('Travel');
  });
});
