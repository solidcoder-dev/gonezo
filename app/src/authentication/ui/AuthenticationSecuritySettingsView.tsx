import type { FormEvent } from 'react';
import styles from '../../shared/ui/ProfileSurface/ProfileSurface.module.css';

export type AuthenticationSecuritySettingsViewProps = {
  readonly enabled: boolean;
  readonly available: boolean;
  readonly password: string;
  readonly error: string;
  readonly onPasswordChange: (password: string) => void;
  readonly onEnable: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDisable: () => void;
  readonly onLogout: () => void;
};

export function AuthenticationSecuritySettingsView(props: AuthenticationSecuritySettingsViewProps) {
  return (
    <section className={styles.securitySection} aria-labelledby="profile-security-heading">
      <h2 id="profile-security-heading">Security</h2>
      <p className={styles.securityState}>Device unlock <span>{props.enabled ? 'On' : 'Off'}</span></p>
      {!props.enabled && props.available ? (
        <form className={styles.securityForm} onSubmit={props.onEnable}>
          <label htmlFor="device-unlock-password">Password to enable device unlock</label>
          <input id="device-unlock-password" type="password" autoComplete="current-password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} required />
          <button className={styles.secondaryAction} type="submit">Enable device unlock</button>
        </form>
      ) : null}
      {props.enabled ? <button className={styles.secondaryAction} type="button" onClick={props.onDisable}>Disable device unlock</button> : null}
      {!props.available && !props.enabled ? <p>Device authentication is unavailable on this device.</p> : null}
      <button className={styles.secondaryAction} type="button" onClick={props.onLogout}>Log out</button>
      {props.error ? <p role="alert" className="text-danger">{props.error}</p> : null}
    </section>
  );
}
