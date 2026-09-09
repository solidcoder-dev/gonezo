import type { ReactNode } from 'react';
import styles from './WorkspacePageHeader.module.css';

export type WorkspacePageHeaderProps = {
  required: {
    title: string;
    searchAction?: ReactNode;
    variant?: 'screen' | 'product';
    unreadCount?: number | null;
  };
  provided: {
    commands: {
      openNotifications: () => void;
    };
  };
};

export function WorkspacePageHeader({ required, provided }: WorkspacePageHeaderProps) {
  return (
    <header className={`${styles.header} position-sticky bg-body d-flex align-items-center justify-content-between gap-2 py-2`}>
      <h1 className={`${styles.title} ${required.variant === 'product' ? styles.productTitle : ''} m-0`}>{required.title}</h1>
      <div className={`${styles.actions} d-inline-flex align-items-center justify-content-end gap-2`}>
        {required.searchAction}
        <button
          type="button"
          className="gz-icon-button"
          aria-label={required.unreadCount === null || required.unreadCount === undefined ? 'Open notifications' : `Open notifications, ${required.unreadCount} unread`}
          onClick={provided.commands.openNotifications}
        >
          <i className="bi bi-bell" aria-hidden />
          {required.unreadCount !== null && required.unreadCount !== undefined && required.unreadCount > 0 ? <span className="badge text-bg-primary">{required.unreadCount > 99 ? '99+' : required.unreadCount}</span> : null}
        </button>
      </div>
    </header>
  );
}
