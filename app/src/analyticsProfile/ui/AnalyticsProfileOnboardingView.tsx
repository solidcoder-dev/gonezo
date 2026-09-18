import { useState, type FormEvent, type ReactNode } from 'react';
import type { AnalyticsProfile, AnalyticsProfileDraft, AnalyticsProfileSex } from '../domain/analyticsProfile';
import { ANALYTICS_PROFILE_COUNTRIES, ANALYTICS_PROFILE_REGIONS, ANALYTICS_PROFILE_SEXES, validateAnalyticsProfileDraft } from '../domain/analyticsProfile';
import { OnboardingShell } from './OnboardingShell';
import styles from './onboarding.module.css';

type AnalyticsProfileFormDraft = Omit<AnalyticsProfileDraft, 'sex'> & { sex: AnalyticsProfileSex | '' };

const emptyDraft = (userId: string): AnalyticsProfileFormDraft => ({ userId, birthYear: 0, sex: '', countryCode: '', regionCode: '' });

export function AnalyticsProfileOnboardingView({ userId, profile, initialDraft, editing = false, error, saving, onComplete }: {
  userId: string;
  profile: AnalyticsProfile | null;
  initialDraft?: AnalyticsProfileFormDraft;
  editing?: boolean;
  error: string;
  saving: boolean;
  onComplete: (draft: AnalyticsProfileDraft) => void;
}) {
  const [step, setStep] = useState(editing || initialDraft ? 4 : 1);
  const [draft, setDraft] = useState<AnalyticsProfileFormDraft>(profile ?? initialDraft ?? emptyDraft(userId));
  const [errors, setErrors] = useState<ReturnType<typeof validateAnalyticsProfileDraft>>({});
  const regions = ANALYTICS_PROFILE_REGIONS[draft.countryCode] ?? [];
  const update = <K extends keyof AnalyticsProfileFormDraft>(key: K, value: AnalyticsProfileFormDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAnalyticsProfileDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onComplete({ ...draft, sex: draft.sex as AnalyticsProfileSex });
  };
  const action = editing
    ? <button className={styles.primaryAction} form="analytics-profile-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    : step === 1
      ? <button className={styles.primaryAction} type="button" onClick={() => setStep(2)}>Get started</button>
      : step === 4
        ? <button className={styles.primaryAction} form="analytics-profile-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Start using Gonezo'}</button>
        : <button className={styles.primaryAction} type="button" onClick={() => setStep((current) => current + 1)}>Continue</button>;
  if (editing) return (
    <OnboardingShell step={4} onBack={() => window.history.back()} busy={saving} action={<button className={styles.primaryAction} form="analytics-profile-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>}>
      <h1>A few details about you</h1>
      <p>We use these details to create meaningful statistical groups.</p>
      <p>Gonezo requires this demographic information as part of the service’s analytics model.</p>
      <form id="analytics-profile-form" className={styles.form} onSubmit={submitProfile}>
        <ProfileFields draft={draft} update={update} regions={regions} errors={errors} />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form>
    </OnboardingShell>
  );
  return (
    <OnboardingShell step={step} onBack={step > 1 ? () => setStep((current) => current - 1) : undefined} busy={saving} action={action}>
      {step === 1 ? <div className={styles.welcome}>
        <p className={styles.brand}>Gonezo</p>
        <h1>Your money.<br />A clearer tomorrow.</h1>
        <p>Manage your finances and understand them in context.</p>
        <img className={styles.landscape} src="/assets/gonezo-landscape-trees.png" alt="" />
      </div> : null}
      {step === 2 ? <div>
        <p className={styles.eyebrow}>HOW IT WORKS</p><h1>A clearer view of your money</h1>
        <p>Gonezo helps you understand your finances and build useful financial insights from the information you record.</p>
        <ul className={styles.explanationList}>
          <li><span aria-hidden>↗</span><span><strong>Track your finances</strong><br />Accounts, movements and financial activity in one place.</span></li>
          <li><span aria-hidden>⌁</span><span><strong>Understand your habits</strong><br />See spending, income and trends in context.</span></li>
          <li><span aria-hidden>◷</span><span><strong>Build better insights</strong><br />Demographic context allows meaningful aggregated comparisons.</span></li>
        </ul>
      </div> : null}
      {step === 3 ? <div>
        <p className={styles.eyebrow}>YOUR DATA</p><h1>A little context makes the numbers useful.</h1>
        <p>Gonezo requires a small demographic profile so financial statistics can be compared across meaningful groups.</p>
        <ul className={styles.dataList}>
          <li><strong>Year of birth</strong><span>Used to derive age groups.</span></li>
          <li><strong>Sex</strong><span>Used for demographic comparison.</span></li>
          <li><strong>Country and region</strong><span>Used for geographic comparison.</span></li>
          <li><strong>Financial activity</strong><span>Gonezo derives financial metrics from the data you record.</span></li>
        </ul>
      </div> : null}
      {step === 4 ? <form id="analytics-profile-form" className={styles.form} onSubmit={submitProfile}>
        <p className={styles.eyebrow}>ABOUT YOU</p><h1>A few details about you</h1>
        <p>We use these details to create meaningful statistical groups.</p>
        <ProfileFields draft={draft} update={update} regions={regions} errors={errors} />
        <p>Gonezo requires this demographic information as part of the service’s analytics model. You can review and update these details later from Profile.</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form> : null}
    </OnboardingShell>
  );
}

function ProfileFields({ draft, update, regions, errors }: {
  draft: AnalyticsProfileFormDraft;
  update: <K extends keyof AnalyticsProfileFormDraft>(key: K, value: AnalyticsProfileFormDraft[K]) => void;
  regions: readonly { code: string; label: string }[];
  errors: ReturnType<typeof validateAnalyticsProfileDraft>;
}) {
  return <>
    <Field id="birthYear" label="Year of birth" error={errors.birthYear}><input id="birthYear" type="number" inputMode="numeric" value={draft.birthYear || ''} aria-invalid={Boolean(errors.birthYear)} aria-describedby={errors.birthYear ? 'birthYear-error' : undefined} onChange={(event) => update('birthYear', Number(event.target.value))} /></Field>
    <Field id="sex" label="Sex" error={errors.sex}><select id="sex" value={draft.sex} aria-invalid={Boolean(errors.sex)} aria-describedby={errors.sex ? 'sex-error' : undefined} onChange={(event) => update('sex', event.target.value as AnalyticsProfileFormDraft['sex'])}><option value="">Select an option</option>{ANALYTICS_PROFILE_SEXES.map((sex) => <option key={sex} value={sex}>{sex === 'not_disclosed' ? 'Prefer not to say' : sex[0].toUpperCase() + sex.slice(1)}</option>)}</select></Field>
    <Field id="countryCode" label="Country" error={errors.countryCode}><select id="countryCode" value={draft.countryCode} aria-invalid={Boolean(errors.countryCode)} aria-describedby={errors.countryCode ? 'countryCode-error' : undefined} onChange={(event) => { update('countryCode', event.target.value); update('regionCode', ''); }}><option value="">Select country</option>{ANALYTICS_PROFILE_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></Field>
    <Field id="regionCode" label="Region" error={errors.regionCode}><select id="regionCode" value={draft.regionCode} disabled={regions.length === 0} aria-invalid={Boolean(errors.regionCode)} aria-describedby={errors.regionCode ? 'regionCode-error' : undefined} onChange={(event) => update('regionCode', event.target.value)}><option value="">Select region</option>{regions.map((region) => <option key={region.code} value={region.code}>{region.label}</option>)}</select></Field>
  </>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return <div className={styles.field}><label htmlFor={id}>{label}</label>{children}{error ? <span className={styles.error} id={`${id}-error`} role="alert">{error}</span> : null}</div>;
}
