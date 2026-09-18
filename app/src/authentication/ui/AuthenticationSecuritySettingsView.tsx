import type { FormEvent } from 'react';

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
    <section className="profile-security-section" aria-labelledby="profile-security-heading">
      <h2 id="profile-security-heading">Security</h2>
      <p className="profile-security-state">Device unlock <span>{props.enabled ? 'On' : 'Off'}</span></p>
      {!props.enabled && props.available ? (
        <form className="profile-security-form" onSubmit={props.onEnable}>
          <label htmlFor="device-unlock-password">Password to enable device unlock</label>
          <input id="device-unlock-password" type="password" autoComplete="current-password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} required />
          <button className="profile-secondary-action" type="submit">Enable device unlock</button>
        </form>
      ) : null}
      {props.enabled ? <button className="profile-secondary-action" type="button" onClick={props.onDisable}>Disable device unlock</button> : null}
      {!props.available && !props.enabled ? <p>Device authentication is unavailable on this device.</p> : null}
      <button className="profile-secondary-action" type="button" onClick={props.onLogout}>Log out</button>
      {props.error ? <p role="alert" className="text-danger">{props.error}</p> : null}
    </section>
  );
}
