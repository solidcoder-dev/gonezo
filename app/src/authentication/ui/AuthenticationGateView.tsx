import type { FormEvent } from 'react';

export type AuthenticationGateViewProps = {
  readonly state: 'loading' | 'setup' | 'locked';
  readonly mode: 'sign-in' | 'create-account';
  readonly deviceUnlockAvailable: boolean;
  readonly deviceUnlockEnabled: boolean;
  readonly submitting: boolean;
  readonly error: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onModeChange: (mode: 'sign-in' | 'create-account') => void;
  readonly onDeviceUnlock: () => void;
};

export function AuthenticationGateView(props: AuthenticationGateViewProps) {
  if (props.state === 'loading') return <main aria-busy="true" className="container py-5">Loading authentication…</main>;
  return (
    <main className="container py-5" aria-labelledby="authentication-title">
      <section className="mx-auto" style={{ maxWidth: '28rem' }}>
        <h1 id="authentication-title">Authentication</h1>
        <div className="btn-group mb-3" role="group" aria-label="Authentication mode">
          <button className={`btn ${props.mode === 'sign-in' ? 'btn-primary' : 'btn-outline-primary'}`} type="button" aria-pressed={props.mode === 'sign-in'} onClick={() => props.onModeChange('sign-in')}>Sign in</button>
          <button className={`btn ${props.mode === 'create-account' ? 'btn-primary' : 'btn-outline-primary'}`} type="button" aria-pressed={props.mode === 'create-account'} onClick={() => props.onModeChange('create-account')}>Create account</button>
        </div>
        {props.state === 'locked' && props.deviceUnlockEnabled && !props.deviceUnlockAvailable
          ? <p role="status">Device authentication is unavailable. Sign in with your password.</p>
          : null}
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
