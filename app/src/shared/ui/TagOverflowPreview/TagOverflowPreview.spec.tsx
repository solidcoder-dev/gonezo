import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TagOverflowPreview } from './TagOverflowPreview';

describe('TagOverflowPreview', () => {
  it('renders no tags as muted metadata', () => {
    render(<TagOverflowPreview tags={[]} />);

    expect(screen.getByText('No tags')).toHaveClass('text-secondary');
  });

  it('keeps the overflow count as non-interactive metadata', () => {
    render(<TagOverflowPreview tags={['home', 'rent', 'utilities']} />);
    const preview = screen.getByTestId('tag-overflow-preview');
    Object.defineProperty(preview, 'clientWidth', { configurable: true, value: 100 });
    preview.dispatchEvent(new Event('resize'));

    expect(screen.getByLabelText('home, rent, utilities')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more tags/i })).not.toBeInTheDocument();
  });
});
