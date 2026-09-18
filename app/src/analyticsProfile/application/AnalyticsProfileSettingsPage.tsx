import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticationSession } from '../../authentication/application/authenticationSessionContext';
import type { AnalyticsProfile, AnalyticsProfileDraft } from '../domain/analyticsProfile';
import type { AnalyticsProfilePort } from './analyticsProfile.port';
import { getAnalyticsProfile, saveAnalyticsProfile } from './analyticsProfileUseCases';
import { AnalyticsProfileOnboardingView } from '../ui/AnalyticsProfileOnboardingView';

export function AnalyticsProfileSettingsPage({ port }: { port: AnalyticsProfilePort }) {
  const { userId } = useAuthenticationSession();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AnalyticsProfile | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const loaded = await getAnalyticsProfile(port, userId);
      if (!loaded) throw new Error('Profile is unavailable');
      setProfile(loaded);
    } catch {
      setError('Profile could not be loaded. Try again.');
    }
  }, [port, userId]);
  useEffect(() => { void load(); }, [load]);

  async function save(draft: AnalyticsProfileDraft) {
    setSaving(true);
    setError('');
    try {
      const updated = await saveAnalyticsProfile(port, { ...draft, userId });
      setProfile(updated);
      void navigate('/profile');
    } catch {
      setError('Profile could not be saved. Your information has not been lost. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <main className="analytics-profile-status" aria-busy={!error}>{error ? <><p role="alert">{error}</p><button type="button" onClick={() => { setError(''); void load(); }}>Try again</button></> : <p role="status">Loading your profile…</p>}</main>;
  return <AnalyticsProfileOnboardingView userId={userId} profile={profile} editing error={error} saving={saving} onComplete={(draft) => { void save(draft); }} />;
}
