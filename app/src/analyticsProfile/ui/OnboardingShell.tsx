import type { ReactNode } from 'react';
import styles from './onboarding.module.css';

export function OnboardingShell({ step, onBack, children, action, busy = false }: {
  step: number;
  onBack?: () => void;
  children: ReactNode;
  action: ReactNode;
  busy?: boolean;
}) {
  return (
    <main className={styles.shell} aria-busy={busy}>
      <header className={styles.header}>
        {onBack ? <button className={styles.back} type="button" onClick={onBack} aria-label="Go back">←</button> : <span aria-hidden />}
        <span className={styles.progressLabel}>Step {step} of 4</span>
      </header>
      <div className={styles.progress} role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}><span style={{ width: `${step * 25}%` }} /></div>
      <section className={styles.content} key={step}>{children}</section>
      <footer className={styles.footer}>{action}</footer>
    </main>
  );
}
