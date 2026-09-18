import type { FormEvent, ReactNode } from 'react';

export type AuthenticationGateViewProps = {
  readonly state: 'loading' | 'setup' | 'locked' | 'authenticated';
  readonly mode: 'sign-in' | 'create-account';
  readonly deviceUnlockAvailable: boolean;
  readonly deviceUnlockEnabled: boolean;
  readonly submitting: boolean;
  readonly error: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onModeChange: (mode: 'sign-in' | 'create-account') => void;
  readonly onDeviceUnlock: () => void;
  readonly onEnableDeviceUnlock: () => void;
  readonly onDisableDeviceUnlock: () => void;
  readonly onLogout: () => void;
  readonly children: ReactNode;
};

export function AuthenticationGateView(props: AuthenticationGateViewProps) {
  if (props.state === 'loading') return <main aria-busy="true" className="container py-5">Loading authentication…</main>;
  if (props.state === 'authenticated') {
    return (
      <>
        {props.children}
        {props.error ? <p role="alert" className="text-danger text-center">{props.error}</p> : null}
        <div className="d-flex justify-content-center gap-2 py-2">
          {props.deviceUnlockAvailable && !props.deviceUnlockEnabled ? <button className="btn btn-outline-secondary" type="button" onClick={props.onEnableDeviceUnlock}>Enable device unlock</button> : null}
          {props.deviceUnlockEnabled ? <button className="btn btn-outline-secondary" type="button" onClick={props.onDisableDeviceUnlock}>Disable device unlock</button> : null}
          <button className="btn btn-outline-secondary" type="button" onClick={props.onLogout}>Lock Gonezo</button>
        </div>
      </>
    );
  }

  return (
    <main className="container py-5" aria-labelledby="authentication-title">
      <section className="mx-auto" style={{ maxWidth: '28rem' }}>
        <h1 id="authentication-title">Authentication</h1>
        <div className="btn-group mb-3" role="group" aria-label="Authentication mode">
          <button className={`btn ${props.mode === 'sign-in' ? 'btn-primary' : 'btn-outline-primary'}`} type="button" aria-pressed={props.mode === 'sign-in'} onClick={() => props.onModeChange('sign-in')}>Sign in</button>
          <button className={`btn ${props.mode === 'create-account' ? 'btn-primary' : 'btn-outline-primary'}`} type="button" aria-pressed={props.mode === 'create-account'} onClick={() => props.onModeChange('create-account')}>Create account</button>
        </div>
        {props.state === 'locked' && props.deviceUnlockEnabled && props.deviceUnlockAvailable ? <button className="btn btn-outline-primary mb-3" type="button" onClick={props.onDeviceUnlock}>Unlock with device</button> : null}
        <form onSubmit={props.onSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="authentication-username">Username</label>
            <input id="authentication-username" name="username" className="form-control" autoComplete="username" required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="authentication-password">Password</label>
            <input id="authentication-password" name="password" className="form-control" type="password" autoComplete={props.mode === 'create-account' ? 'new-password' : 'current-password'} required />
          </div>
          {props.mode === 'create-account' ? <div className="mb-3">
            <label className="form-label" htmlFor="authentication-confirm-password">Confirm password</label>
            <input id="authentication-confirm-password" name="confirmPassword" className="form-control" type="password" autoComplete="new-password" required />
          </div> : null}
          {props.error ? <p role="alert" className="text-danger">{props.error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={props.submitting}>{props.submitting ? 'Please wait…' : props.mode === 'create-account' ? 'Create account' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
