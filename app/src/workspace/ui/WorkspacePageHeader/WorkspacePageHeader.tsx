import type { ReactNode } from 'react';
import styles from './WorkspacePageHeader.module.css';

export type WorkspacePageHeaderProps = {
  required: {
    title: string;
    searchAction?: ReactNode;
  };
  provided: {
    commands: {
      openNotifications: () => void;
    };
  };
};

export function WorkspacePageHeader({ required, provided }: WorkspacePageHeaderProps) {
  return (
    <header className={`${styles.header} ${styles.sticky}`}>
      <h1 className={styles.title}>{required.title}</h1>
      <div className={styles.actions}>
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
