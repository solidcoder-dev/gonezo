import { useEffect, useState, type ReactNode } from 'react';
import { useAuthenticationSession } from '../../authentication/application/authenticationSessionContext';
import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import { isAnalyticsProfileComplete } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from './analyticsProfile.port';
import { getAnalyticsProfile, saveAnalyticsProfile } from './analyticsProfileUseCases';
import { AnalyticsProfileOnboardingView } from '../ui/AnalyticsProfileOnboardingView';

type RequiredOnboardingState =
  | { status: 'loading' }
  | { status: 'required'; profile: AnalyticsProfile | null; draft?: AnalyticsProfileDraft; error: string }
  | { status: 'saving'; profile: AnalyticsProfile | null; draft: AnalyticsProfileDraft }
  | { status: 'complete'; profile: AnalyticsProfile }
  | { status: 'error'; message: string };

export function RequiredOnboardingGate({ port, children }: { port: AnalyticsProfilePort; children: ReactNode }) {
  const { userId } = useAuthenticationSession();
  const [state, setState] = useState<RequiredOnboardingState>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    void getAnalyticsProfile(port, userId)
      .then((profile) => {
        if (active) setState(isAnalyticsProfileComplete(profile)
          ? { status: 'complete', profile }
          : { status: 'required', profile, error: '' });
      })
      .catch(() => {
        if (active) setState({ status: 'error', message: 'Profile could not be loaded. Try again.' });
      });
    return () => { active = false; };
  }, [port, reloadCount, userId]);

  async function complete(draft: AnalyticsProfileDraft) {
    const previous = state.status === 'required' ? state.profile : null;
    setState({ status: 'saving', profile: previous, draft });
    try {
      const profile = await saveAnalyticsProfile(port, { ...draft, userId });
      setState({ status: 'complete', profile });
    } catch {
      setState({ status: 'required', profile: previous, draft, error: 'Profile could not be saved. Your information has not been lost. Try again.' });
    }
  }

  if (state.status === 'complete') return children;
  if (state.status === 'loading' || state.status === 'saving') return <main className="analytics-profile-status" aria-busy="true"><p role="status">{state.status === 'saving' ? 'Saving your profile…' : 'Loading your profile…'}</p></main>;
  if (state.status === 'error') return <main className="analytics-profile-status"><p role="alert">{state.message}</p><button type="button" onClick={() => { setState({ status: 'loading' }); setReloadCount((count) => count + 1); }}>Try again</button></main>;
  return <AnalyticsProfileOnboardingView userId={userId} profile={state.profile} initialDraft={state.draft} error={state.error} saving={false} onComplete={(draft) => { void complete(draft); }} />;
}
