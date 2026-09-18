import type { FormEvent } from 'react';
import styles from './AuthenticationGateView.module.css';

export type AuthenticationGateViewProps = {
  readonly state: 'loading' | 'setup' | 'locked';
  readonly deviceUnlockAvailable: boolean;
  readonly deviceUnlockEnabled: boolean;
  readonly submitting: boolean;
  readonly error: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDeviceUnlock: () => void;
};

export function AuthenticationGateView(props: AuthenticationGateViewProps) {
  if (props.state === 'loading') return <main aria-busy="true" className={styles.page}><p role="status">Loading Gonezo…</p></main>;
  const creatingAccount = props.state === 'setup';
  return (
    <main className={styles.page} aria-labelledby="authentication-title">
      <section className={styles.content}>
        <p className={styles.brand}>Gonezo</p>
        <h1 id="authentication-title" className={styles.title}>{creatingAccount ? 'Your money. A clearer tomorrow.' : 'Welcome back'}</h1>
        <p className={styles.description}>{creatingAccount ? 'Create your account to start managing your finances and understanding them in context.' : 'Sign in to continue to your finances.'}</p>
        {props.state === 'locked' && props.deviceUnlockEnabled && !props.deviceUnlockAvailable
          ? <p role="status" className={styles.message}>Device authentication is unavailable. Sign in with your password.</p>
          : null}
        {props.state === 'locked' && props.deviceUnlockEnabled && props.deviceUnlockAvailable ? <button className={styles.secondaryAction} type="button" onClick={props.onDeviceUnlock}>Unlock with device</button> : null}
        <form className={styles.form} onSubmit={props.onSubmit} aria-busy={props.submitting}>
          <div className={styles.field}>
            <label htmlFor="authentication-username">Username</label>
            <input id="authentication-username" name="username" autoComplete="username" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="authentication-password">Password</label>
            <input id="authentication-password" name="password" type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} required />
          </div>
          {creatingAccount ? <div className={styles.field}>
            <label htmlFor="authentication-confirm-password">Confirm password</label>
            <input id="authentication-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div> : null}
          {props.error ? <p role="alert" className={styles.error}>{props.error}</p> : null}
          <button className={styles.primaryAction} type="submit" disabled={props.submitting}>{props.submitting ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
