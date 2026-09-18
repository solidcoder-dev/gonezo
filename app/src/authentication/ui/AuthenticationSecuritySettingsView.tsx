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
    <section aria-labelledby="profile-security-heading">
      <h2 id="profile-security-heading">Security</h2>
      {!props.enabled && props.available ? (
        <form onSubmit={props.onEnable}>
          <label className="form-label" htmlFor="device-unlock-password">Password to enable device unlock</label>
          <input id="device-unlock-password" className="form-control mb-2" type="password" autoComplete="current-password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} required />
          <button className="btn btn-outline-secondary" type="submit">Enable device unlock</button>
        </form>
      ) : null}
      {props.enabled ? <button className="btn btn-outline-secondary" type="button" onClick={props.onDisable}>Disable device unlock</button> : null}
      {!props.available && !props.enabled ? <p>Device authentication is unavailable on this device.</p> : null}
      <button className="btn btn-outline-secondary ms-2" type="button" onClick={props.onLogout}>Log out</button>
      {props.error ? <p role="alert" className="text-danger">{props.error}</p> : null}
    </section>
  );
}
