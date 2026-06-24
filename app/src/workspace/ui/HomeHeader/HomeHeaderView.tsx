import styles from './HomeHeaderView.module.css';

export type HomeHeaderViewProps = {
  provided: {
    commands: {
      openNotifications: () => void;
    };
  };
};

export function HomeHeaderView({ provided }: HomeHeaderViewProps) {
  return (
    <header className={styles.header}>
      <h1>Gonezo</h1>
      <button
        type="button"
        className={styles.notificationButton}
        aria-label="Open notifications"
        onClick={provided.commands.openNotifications}
      >
        <i className="bi bi-bell" aria-hidden />
      </button>
    </header>
  );
}
