import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import styles from './WorkspacePageHeader.module.css';
import { WorkspacePageHeader } from './WorkspacePageHeader';

describe('WorkspacePageHeader', () => {
  it('renders the sticky header with the search action before notifications', () => {
    const { container } = render(
      <MemoryRouter>
        <WorkspacePageHeader
          required={{
            title: 'Movements',
            searchAction: (
              <a className="gz-icon-button" href="/movements/search" aria-label="Search movements">
                <i className="bi bi-search" aria-hidden />
              </a>
            ),
          }}
          provided={{
            commands: {
              openNotifications: vi.fn(),
            },
          }}
        />
      </MemoryRouter>,
    );

    const header = container.querySelector('header');
    expect(header).toHaveClass('position-sticky', 'bg-body', 'py-2');
    expect(header).not.toHaveClass('decorative-surface');
    expect(screen.getByRole('heading', { name: 'Movements' })).toBeInTheDocument();
    const searchLink = screen.getByRole('link', { name: 'Search movements' });
    const notificationsButton = screen.getByRole('button', { name: 'Open notifications' });
    expect(searchLink.compareDocumentPosition(notificationsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies the product presentation only when requested', () => {
    const { rerender, container } = render(
      <WorkspacePageHeader
        required={{ title: 'Gonezo', variant: 'product' }}
        provided={{ commands: { openNotifications: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Gonezo' })).toHaveClass(styles.productTitle);

    rerender(
      <WorkspacePageHeader
        required={{ title: 'Movements' }}
        provided={{ commands: { openNotifications: vi.fn() } }}
      />,
    );

    expect(container.querySelector('h1')).not.toHaveClass(styles.productTitle);
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  });

  it('shows the unread badge without changing the bell action', () => {
    render(
      <WorkspacePageHeader
        required={{ title: 'Gonezo', unreadCount: 123 }}
        provided={{ commands: { openNotifications: vi.fn() } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open notifications, 123 unread' })).toBeInTheDocument();
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('places the visibility toggle before notifications and changes its accessible action', () => {
    const toggle = vi.fn();
    const { rerender } = render(
      <WorkspacePageHeader
        required={{ title: 'Movements', amountVisibility: { visibility: 'visible', loading: false, saving: false } }}
        provided={{ commands: { openNotifications: vi.fn(), toggleAmountVisibility: toggle } }}
      />,
    );

    const hideButton = screen.getByRole('button', { name: 'Hide amounts' });
    const notificationsButton = screen.getByRole('button', { name: 'Open notifications' });
    expect(hideButton.compareDocumentPosition(notificationsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(hideButton);
    expect(toggle).toHaveBeenCalledOnce();
    expect(hideButton.querySelector('i')).toHaveClass('bi-eye');

    rerender(
      <WorkspacePageHeader
        required={{ title: 'Movements', amountVisibility: { visibility: 'hidden', loading: false, saving: true } }}
        provided={{ commands: { openNotifications: vi.fn(), toggleAmountVisibility: toggle } }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Show amounts' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show amounts' }).querySelector('i')).toHaveClass('bi-eye-slash');
  });
});
