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
              <a className="text-button icon-button" href="/movements/search" aria-label="Search movements">
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
    expect(header).toHaveClass(styles.sticky);
    expect(screen.getByRole('heading', { name: 'Movements' })).toBeInTheDocument();
    const searchLink = screen.getByRole('link', { name: 'Search movements' });
    const notificationsButton = screen.getByRole('button', { name: 'Open notifications' });
    expect(searchLink.compareDocumentPosition(notificationsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
