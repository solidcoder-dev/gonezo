import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MultiTagPickerView } from './MultiTagPickerView';

describe('MultiTagPickerView', () => {
  it('renders selected tags as removable chips and limits suggestions', () => {
    const removeTag = vi.fn();
    render(
      <MultiTagPickerView
        required={{
          config: { label: 'Tags', placeholder: 'Add tag...', maxSuggestions: 2 },
          data: {
            selectedTags: [{ id: 'tag-1', name: 'summer-trip-family' }],
            suggestions: [
              { id: 'tag-2', name: 'summer-trip-work' },
              { id: 'tag-3', name: 'summer-trip-2026' },
              { id: 'tag-4', name: 'summer-trip-private' },
            ],
          },
          state: { query: 'summer-trip', createCandidate: 'summer-trip' },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeQuery: vi.fn(),
            selectTag: vi.fn(),
            removeTag,
            createTag: vi.fn(),
            removeLastTag: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove tag summer-trip-family' }));
    expect(removeTag).toHaveBeenCalledWith('tag-1');
    expect(screen.getByLabelText('Selected tags')).toContainElement(screen.getByRole('button', { name: 'Remove tag summer-trip-family' }));
    expect(screen.getByRole('textbox', { name: 'Tags' }).closest('.multi-tag-picker-field')).not.toContainElement(screen.getByRole('button', { name: 'Remove tag summer-trip-family' }));
    expect(screen.getByTitle('summer-trip-work')).toBeInTheDocument();
    expect(screen.getByTitle('summer-trip-2026')).toBeInTheDocument();
    expect(screen.queryByTitle('summer-trip-private')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ summer-trip' })).toBeInTheDocument();
  });

  it('selects the first suggestion or creates the candidate with Enter', () => {
    const selectTag = vi.fn();
    const createTag = vi.fn();
    const { rerender } = render(
      <MultiTagPickerView
        required={{
          config: { label: 'Tags', placeholder: 'Add tag...' },
          data: {
            selectedTags: [],
            suggestions: [{ id: 'tag-travel', name: 'travel' }],
          },
          state: { query: 'tra', createCandidate: 'tra' },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeQuery: vi.fn(),
            selectTag,
            removeTag: vi.fn(),
            createTag,
            removeLastTag: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' });
    expect(selectTag).toHaveBeenCalledWith('tag-travel');
    expect(createTag).not.toHaveBeenCalled();

    rerender(
      <MultiTagPickerView
        required={{
          config: { label: 'Tags', placeholder: 'Add tag...' },
          data: { selectedTags: [], suggestions: [] },
          state: { query: 'trip', createCandidate: 'trip' },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeQuery: vi.fn(),
            selectTag,
            removeTag: vi.fn(),
            createTag,
            removeLastTag: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' });
    expect(createTag).toHaveBeenCalledWith('trip');
  });

  it('removes the last tag with Backspace when the input is empty', () => {
    const removeLastTag = vi.fn();
    render(
      <MultiTagPickerView
        required={{
          config: { label: 'Tags', placeholder: 'Add tag...' },
          data: { selectedTags: [{ id: 'tag-home', name: 'home' }], suggestions: [] },
          state: { query: '' },
          status: { disabled: false },
        }}
        provided={{
          commands: {
            changeQuery: vi.fn(),
            selectTag: vi.fn(),
            removeTag: vi.fn(),
            createTag: vi.fn(),
            removeLastTag,
          },
        }}
      />,
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Tags' }), { key: 'Backspace' });
    expect(removeLastTag).toHaveBeenCalledTimes(1);
  });
});
