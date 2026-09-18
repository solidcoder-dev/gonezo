import type { ReactNode } from 'react';
import styles from './onboarding.module.css';

export function OnboardingShell({ step, totalSteps = 4, onBack, children, action, busy = false }: {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  children: ReactNode;
  action: ReactNode;
  busy?: boolean;
}) {
  return (
    <main className={styles.shell} aria-busy={busy}>
      <header className={styles.header}>
        {onBack ? <button className={styles.back} type="button" onClick={onBack} aria-label="Go back">←</button> : <span aria-hidden />}
        <span className={styles.progressLabel}>Step {step} of {totalSteps}</span>
      </header>
      <div className={styles.progress} role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={step}><span style={{ width: `${step / totalSteps * 100}%` }} /></div>
      <section className={styles.content} key={step}>{children}</section>
      <footer className={styles.footer}>{action}</footer>
    </main>
  );
}
