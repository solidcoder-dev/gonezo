import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionComposerPageView } from './TransactionComposerPageView';

describe('TransactionComposerPageView', () => {
  it('renders a non-modal screen with an accessible back navigation', () => {
    const onBack = vi.fn();

    render(
      <TransactionComposerPageView onBack={onBack}>
        <form aria-label="Composer form" />
      </TransactionComposerPageView>,
    );

    const page = screen.getByRole('main', { name: 'Transaction composer' });
    const navigation = screen.getByRole('navigation', { name: 'Transaction composer navigation' });
    const backButton = screen.getByRole('button', { name: 'Back' });

    expect(page).toBeInTheDocument();
    expect(page).not.toHaveAttribute('role', 'dialog');
    expect(page).not.toHaveAttribute('aria-modal');
    expect(navigation).toContainElement(backButton);
    expect(backButton).toHaveClass('gz-icon-button');
    expect(backButton).not.toHaveClass('btn-link');
    expect(backButton.querySelector('.bi-chevron-left')).toBeInTheDocument();
    expect(backButton).not.toHaveTextContent('Back');

    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
