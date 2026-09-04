import type { ReactNode } from 'react';
import styles from './TransactionComposerPageView.module.css';

type TransactionComposerPageViewProps = {
  children: ReactNode;
  onBack: () => void;
};

export function TransactionComposerPageView({ children, onBack }: TransactionComposerPageViewProps) {
  return (
    <main className={styles.screen} aria-label="Transaction composer">
      <div className={styles.content}>
        <nav className={styles.navigation} aria-label="Transaction composer navigation">
          <button type="button" className={`${styles.backButton} gz-text-button gz-icon-button`} aria-label="Back" onClick={onBack}>
            <i className="bi bi-chevron-left" aria-hidden />
          </button>
        </nav>
        {children}
      </div>
    </main>
  );
}
