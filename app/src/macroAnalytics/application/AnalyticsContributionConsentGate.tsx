import { useEffect, useState, type ReactNode } from 'react';
import { useAuthenticationSession } from '../../authentication/application/authenticationSessionContext';
import { OnboardingShell } from '../../analyticsProfile/ui/OnboardingShell';
import type { AnalyticsContributionConsent } from '../domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import {
  declineContributionConsent,
  getContributionConsent,
  grantContributionConsent,
  type ConsentClock,
} from './analyticsContributionConsentUseCases';

type ConsentGateState =
  | { status: 'loading' }
  | { status: 'undecided'; error?: string }
  | { status: 'saving' }
  | { status: 'complete'; consent: AnalyticsContributionConsent }
  | { status: 'error'; message: string };

export function AnalyticsContributionConsentGate({ port, clock, children, onConsentGranted }: {
  port: AnalyticsContributionConsentPort;
  clock: ConsentClock;
  children: ReactNode;
  onConsentGranted?: (userId: string) => void;
}) {
  const { userId } = useAuthenticationSession();
  const [state, setState] = useState<ConsentGateState>({ status: 'loading' });
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    void getContributionConsent(port, userId)
      .then((consent) => {
        if (active) {
          setLoadedUserId(userId);
          setState(consent ? { status: 'complete', consent } : { status: 'undecided' });
        }
      })
      .catch(() => {
        if (active) {
          setLoadedUserId(userId);
          setState({ status: 'error', message: 'Contribution choice could not be loaded. Try again.' });
        }
      });
    return () => { active = false; };
  }, [port, reloadCount, userId]);

  async function decide(status: 'GRANTED' | 'DECLINED') {
    setState({ status: 'saving' });
    try {
      const consent = status === 'GRANTED'
        ? await grantContributionConsent(port, userId, clock)
        : await declineContributionConsent(port, userId, clock);
      setLoadedUserId(userId);
      setState({ status: 'complete', consent });
      if (status === 'GRANTED') onConsentGranted?.(userId);
    } catch {
      setState({ status: 'undecided', error: 'Your choice could not be saved. Your app remains private from contribution. Try again.' });
    }
  }

  if (loadedUserId !== userId) return <main className="analytics-profile-status" aria-busy="true"><p role="status">Loading your privacy choice…</p></main>;
  if (state.status === 'complete') return children;
  if (state.status === 'loading' || state.status === 'saving') return <main className="analytics-profile-status" aria-busy="true"><p role="status">{state.status === 'saving' ? 'Saving your choice…' : 'Loading your privacy choice…'}</p></main>;
  if (state.status === 'error') return <main className="analytics-profile-status"><p role="alert">{state.message}</p><button type="button" onClick={() => { setState({ status: 'loading' }); setReloadCount((count) => count + 1); }}>Try again</button></main>;

  return (
    <OnboardingShell step={5} totalSteps={5} busy={false} action={(
      <div className="d-grid gap-2">
        <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { void decide('GRANTED'); }}>Allow contribution</button>
        <button className="btn btn-outline-secondary w-100" type="button" onClick={() => { void decide('DECLINED'); }}>Not now</button>
      </div>
    )}>
      <p className="text-uppercase text-primary small fw-semibold">OPTIONAL CONTRIBUTION</p>
      <h1>Contribute to aggregated insights?</h1>
      <p>Gonezo may use financial activity together with demographic context to create aggregated statistical insights.</p>
      <p>Participation is optional. Your choice will not affect how you use Gonezo, and you can change it later in Privacy &amp; Analytics.</p>
      {state.error ? <p className="text-danger" role="alert">{state.error}</p> : null}
    </OnboardingShell>
  );
}
