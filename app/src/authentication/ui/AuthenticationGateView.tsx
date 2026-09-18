import type { FormEvent, ReactNode } from 'react';

export type AuthenticationGateViewProps = {
  readonly state: 'loading' | 'setup' | 'locked' | 'authenticated';
  readonly deviceUnlockAvailable: boolean;
  readonly deviceUnlockEnabled: boolean;
  readonly submitting: boolean;
  readonly error: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
        <h1 id="authentication-title">{props.state === 'setup' ? 'Create your Gonezo password' : 'Unlock Gonezo'}</h1>
        {props.state === 'locked' && props.deviceUnlockEnabled && props.deviceUnlockAvailable ? <button className="btn btn-outline-primary mb-3" type="button" onClick={props.onDeviceUnlock}>Unlock with device</button> : null}
        <form onSubmit={props.onSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="authentication-username">Username</label>
            <input id="authentication-username" name="username" className="form-control" autoComplete="username" required />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="authentication-password">Password</label>
            <input id="authentication-password" name="password" className="form-control" type="password" autoComplete={props.state === 'setup' ? 'new-password' : 'current-password'} required />
          </div>
          {props.error ? <p role="alert" className="text-danger">{props.error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={props.submitting}>{props.submitting ? 'Please wait…' : props.state === 'setup' ? 'Create credentials' : 'Unlock'}</button>
        </form>
      </section>
    </main>
  );
}
