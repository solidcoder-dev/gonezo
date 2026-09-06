import type { ReactNode } from 'react';
import styles from './TransactionComposerPageView.module.css';

type TransactionComposerPageViewProps = {
  children: ReactNode;
  onBack: () => void;
  title?: string;
};

export function TransactionComposerPageView({ children, onBack, title = 'New movement' }: TransactionComposerPageViewProps) {
  return (
    <main className={styles.screen} aria-label="Transaction composer">
      <div className={styles.content}>
        <nav className={styles.navigation} aria-label="Transaction composer navigation">
          <button type="button" className={`${styles.backButton} gz-text-button gz-icon-button`} aria-label="Back" onClick={onBack}>
            <i className="bi bi-arrow-left" aria-hidden />
          </button>
          <h1 className={styles.title}>{title}</h1>
        </nav>
        {children}
      </div>
    </main>
  );
}
