import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { MovementReuseSuggestionGroup, MovementReuseSuggestionVariant } from '../../../movements/application/movementReuseSuggestions.port';
import { MovementReuseAutocompleteView } from './MovementReuseAutocompleteView';

const variant: MovementReuseSuggestionVariant = {
  representativeMovementId: 'movement-1', accountId: 'main', accountName: 'Main account with a very long name',
  financialType: 'expense', category: { id: 'cat-1', name: 'Groceries with a very long name' },
  tags: [{ id: 'tag-1', name: 'Food' }, { id: 'tag-2', name: 'Weekly' }], itemCount: 4, shareCount: 2,
  usageCount: 1, lastUsedAt: '2026-01-01', deterministicKey: 'movement-1',
};

const group: MovementReuseSuggestionGroup = {
  title: 'Mercadona', normalizedTitle: 'mercadona', variantCount: 1, primaryVariant: variant,
};

function renderView(overrides: Partial<ComponentProps<typeof MovementReuseAutocompleteView>> = {}) {
  return render(<MovementReuseAutocompleteView
    query="merc" open loading={false} groups={[group]} expandedTitle={null} variants={[]}
    error={undefined} onChange={vi.fn()} onClose={vi.fn()} onToggleGroup={vi.fn()} onSelectVariant={vi.fn()}
    {...overrides}
  />);
}

describe('MovementReuseAutocompleteView metadata', () => {
  it('keeps item and share counters visible beside overflowing metadata', () => {
    renderView();
    expect(screen.getByLabelText('4 items')).toBeVisible();
    expect(screen.getByLabelText('2 shares')).toBeVisible();
  });

  it('shows counters for expanded alternatives too', () => {
    renderView({ expandedTitle: 'mercadona', variants: [{ ...variant, itemCount: 3, shareCount: 1, deterministicKey: 'alternative' }] });
    expect(screen.getByLabelText('3 items')).toBeVisible();
    expect(screen.getByLabelText('1 shares')).toBeVisible();
  });
});
