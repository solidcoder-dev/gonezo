import { render, screen } from '@testing-library/react';
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
});
