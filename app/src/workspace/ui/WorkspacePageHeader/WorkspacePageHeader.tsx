import type { ReactNode } from 'react';
import styles from './WorkspacePageHeader.module.css';

export type WorkspacePageHeaderProps = {
  required: {
    title: string;
    searchAction?: ReactNode;
    variant?: 'screen' | 'product';
  };
  provided: {
    commands: {
      openNotifications: () => void;
    };
  };
};

export function WorkspacePageHeader({ required, provided }: WorkspacePageHeaderProps) {
  return (
    <header className={`${styles.header} ${styles.sticky} d-flex align-items-center justify-content-between gap-2`}>
      <h1 className={`${styles.title} ${required.variant === 'product' ? styles.productTitle : ''} m-0`}>{required.title}</h1>
      <div className={`${styles.actions} d-inline-flex align-items-center justify-content-end gap-2`}>
        {required.searchAction}
        <button
          type="button"
          className={styles.notificationButton}
          aria-label="Open notifications"
          onClick={provided.commands.openNotifications}
        >
          <i className="bi bi-bell" aria-hidden />
        </button>
      </div>
    </header>
  );
}
