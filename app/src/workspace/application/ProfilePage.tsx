import { useNavigate } from 'react-router-dom';
import { SheetView } from '../../shared/ui/SheetView';
import { useAccountHubModel } from '../../account/application/accountHub';
import type { UserPreferencesPort } from '../../account/application/accounts.port';
import type { LedgerAccountHubPort } from '../../ledger/application/useLedgerAccounts';
import { ProfilePageView } from '../ui/ProfilePageView';
import type { LoadPhase } from '../../account/application/accountPage.types';
import type { VoiceMovementExperimentViewModel } from '../ui/ProfilePageView.contract';
import type { AuthenticationUseCases } from '../../authentication/application/authentication.port';
import { AuthenticationSecuritySettings } from '../../authentication/application/AuthenticationSecuritySettings';
import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import { getAnalyticsProfile } from '../../analyticsProfile/application/analyticsProfileUseCases';
import { analyticsProfileLabels } from '../../analyticsProfile/application/AnalyticsProfileLabels';
import { AuthenticationSessionContext } from '../../authentication/application/authenticationSessionContext';
import { useContext, useEffect, useState } from 'react';
import styles from '../ui/ProfilePageView.module.css';
import type { AnalyticsProfile } from '../../analyticsProfile/domain/analyticsProfile';
import type { AnalyticsContributionConsent } from '../../macroAnalytics/domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from '../../macroAnalytics/application/analyticsContributionConsent.port';
import { grantContributionConsent, getContributionConsent, withdrawContributionConsent, type ConsentClock } from '../../macroAnalytics/application/analyticsContributionConsentUseCases';
import type { MacroAnalyticsOutboxPort } from '../../macroAnalytics/application/macroAnalyticsOutbox.port';

export type ProfilePageRequired = {
  authentication?: AuthenticationUseCases;
  analyticsProfile?: AnalyticsProfilePort;
  contributionConsent?: AnalyticsContributionConsentPort;
  contributionConsentClock?: ConsentClock;
  macroAnalyticsOutbox?: Pick<MacroAnalyticsOutboxPort, 'clear'>;
  context: {
    core: LedgerAccountHubPort & UserPreferencesPort;
  };
  config: {
    refreshSignal: boolean;
    voiceEntryAvailable: boolean;
    voiceWorkflowBusy: boolean;
    voiceMovementExperimentEnabled: boolean;
    voiceMovementExperimentLoading: boolean;
    voiceMovementExperimentSaving: boolean;
  };
};

export type ProfilePageProvided = {
  events?: {
    onLoadPhaseChanged?: (phase: LoadPhase) => void;
    onSelectedAccountChanged?: (accountId: string | null) => void;
    onAccountsCountChanged?: (count: number) => void;
    onImportRequested?: () => void;
    onMovementsImportRequested?: () => void;
    onBackupRequested?: () => void;
    onAccountMutated?: () => void;
    onError?: (error: { message: string }) => void;
    onSetVoiceMovementExperimentEnabled?: (enabled: boolean) => void;
  };
};

export type ProfilePageProps = {
  required: ProfilePageRequired;
  provided?: ProfilePageProvided;
};

export function ProfilePage({ required, provided = {} }: ProfilePageProps) {
  const navigate = useNavigate();
  const session = useContext(AuthenticationSessionContext);
  const [analyticsProfile, setAnalyticsProfile] = useState<AnalyticsProfile | null>(null);
  const [analyticsProfileLoading, setAnalyticsProfileLoading] = useState(true);
  const [analyticsProfileError, setAnalyticsProfileError] = useState('');
  const [contributionConsent, setContributionConsent] = useState<AnalyticsContributionConsent | null>(null);
  const [contributionConsentLoading, setContributionConsentLoading] = useState(true);
  const [contributionConsentSaving, setContributionConsentSaving] = useState(false);
  const [contributionConsentError, setContributionConsentError] = useState('');
  const [contributionConsentReloadCount, setContributionConsentReloadCount] = useState(0);
  useEffect(() => {
    if (!required.analyticsProfile || !session) return;
    void getAnalyticsProfile(required.analyticsProfile, session.userId)
      .then(setAnalyticsProfile)
      .catch(() => setAnalyticsProfileError('Analytics profile could not be loaded. Open the settings to try again.'))
      .finally(() => setAnalyticsProfileLoading(false));
  }, [required.analyticsProfile, session]);
  useEffect(() => {
    if (!required.contributionConsent || !session) return;
    let active = true;
    setContributionConsentLoading(true);
    void getContributionConsent(required.contributionConsent, session.userId)
      .then((consent) => { if (active) setContributionConsent(consent); })
      .catch(() => { if (active) setContributionConsentError('Contribution choice could not be loaded. Try again.'); })
      .finally(() => { if (active) setContributionConsentLoading(false); });
    return () => { active = false; };
  }, [required.contributionConsent, contributionConsentReloadCount, session]);
  const model = useAccountHubModel({
    ports: { ledger: required.context.core, preferences: required.context.core },
    refreshSignal: required.config.refreshSignal,
    events: provided.events,
  });
  const {
    accounts,
    supportedCurrencies,
    defaultAccountId,
    createFormOpen,
    createName,
    createCurrency,
    createOpeningBalance,
    creating,
    controlsDisabled,
  } = model.state;
  const voiceMovementExperiment: VoiceMovementExperimentViewModel = {
    enabled: required.config.voiceMovementExperimentEnabled,
    available: required.config.voiceEntryAvailable,
    saving: required.config.voiceMovementExperimentLoading || required.config.voiceMovementExperimentSaving,
    disabled: required.config.voiceMovementExperimentLoading
      || required.config.voiceMovementExperimentSaving
      || required.config.voiceWorkflowBusy
      || !required.config.voiceEntryAvailable,
    description: required.config.voiceMovementExperimentLoading
      ? 'Loading experimental preference...'
      : required.config.voiceMovementExperimentSaving
        ? 'Saving experimental preference...'
        : !required.config.voiceEntryAvailable
          ? 'Voice movement entry is unavailable on this device.'
          : required.config.voiceWorkflowBusy
            ? 'Finish the current voice operation before changing this setting.'
            : 'Replaces the standard Add navigation with the experimental manual and voice movement controls.',
  };
  const analyticsProfileSummary = analyticsProfile ? analyticsProfileLabels(analyticsProfile) : null;

  const {
    submitCreateAccount,
    setDefaultAccount,
    clearDefaultAccount,
    openCreateForm,
    closeCreateForm,
    setCreateName,
    setCreateCurrency,
    setCreateOpeningBalance,
  } = model.commands;

  async function selectFavoriteAccount(accountId: string) {
    if (accountId) {
      await setDefaultAccount(accountId);
    } else {
      await clearDefaultAccount();
    }
    provided.events?.onAccountMutated?.();
  }

  async function updateContributionConsent() {
    if (!required.contributionConsent || !required.contributionConsentClock || !session || !contributionConsent) return;
    setContributionConsentSaving(true);
    setContributionConsentError('');
    try {
      const updated = contributionConsent.status === 'GRANTED'
        ? await withdrawContributionConsent(required.contributionConsent, session.userId, required.contributionConsentClock, required.macroAnalyticsOutbox)
        : await grantContributionConsent(required.contributionConsent, session.userId, required.contributionConsentClock);
      setContributionConsent(updated);
    } catch {
      setContributionConsentError('Contribution choice could not be saved. Try again.');
    } finally {
      setContributionConsentSaving(false);
    }
  }

  return (
    <>
      {createFormOpen ? (
        <SheetView
          required={{
            config: {
              ariaLabel: 'Create account',
              title: 'Add account',
              closeLabel: 'Close add account sheet',
              panelClassName: 'import-sheet',
              contentClassName: 'import-sheet-content',
            },
            data: {
              body: (
                <form className="vstack gap-2" onSubmit={(event) => { void submitCreateAccount(event); }} aria-busy={creating}>
                  <input
                    className="form-control"
                    aria-label="Account name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Account name"
                    autoComplete="off"
                  />
                  <input
                    className="form-control"
                    aria-label="Opening balance"
                    value={createOpeningBalance}
                    onChange={(event) => setCreateOpeningBalance(event.target.value)}
                    placeholder="Opening balance (optional)"
                    inputMode="decimal"
                  />
                  <label className="d-grid gap-2">
                    Currency
                    <select
                      className="form-select"
                      aria-label="Currency"
                      value={createCurrency}
                      onChange={(event) => setCreateCurrency(event.target.value)}
                    >
                      {supportedCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="btn btn-primary w-100" disabled={creating}>
                    {creating ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: closeCreateForm } }}
        />
      ) : null}
      <ProfilePageView
        required={{
          config: {},
          data: {
            accounts,
            voiceMovementExperiment,
          },
          state: {
            favoriteAccountId: defaultAccountId ?? '',
          },
          status: {
            disabled: controlsDisabled,
          },
        }}
        provided={{
          commands: {
            selectFavoriteAccount: (accountId) => {
              void selectFavoriteAccount(accountId).catch((error: unknown) => {
                provided.events?.onError?.({ message: error instanceof Error ? error.message : 'Unknown error' });
              });
            },
            addAccount: openCreateForm,
            importBackup: () => { void provided.events?.onImportRequested?.(); },
            importMovements: () => { void provided.events?.onMovementsImportRequested?.(); },
            exportBackup: () => { void provided.events?.onBackupRequested?.(); },
            manageTaxonomy: () => { void navigate('/taxonomy'); },
            manageSharingPeople: () => { void navigate('/profile/sharing-people'); },
            openNotificationSettings: () => { void navigate('/profile/notifications'); },
            setVoiceMovementExperimentEnabled: (enabled) => {
              provided.events?.onSetVoiceMovementExperimentEnabled?.(enabled);
            },
          },
        }}
      />
      <section className={styles.analyticsSection} aria-labelledby="profile-analytics-heading">
        <h2 id="profile-analytics-heading">Privacy &amp; Analytics</h2>
        {analyticsProfileError ? <p role="alert">{analyticsProfileError}</p> : null}
        {([
          ['Year of birth', analyticsProfileSummary?.birthYear ?? ''],
          ['Sex', analyticsProfileSummary?.sex ?? ''],
          ['Country', analyticsProfileSummary?.country ?? ''],
          ['Region', analyticsProfileSummary?.region ?? ''],
        ] as const).map(([label, value]) => <button className={styles.analyticsRow} type="button" key={label} onClick={() => { void navigate('/profile/analytics-profile'); }}><span>{label}</span><span>{analyticsProfileLoading ? 'Loading…' : value || 'Edit'}<span aria-hidden="true"> ›</span></span></button>)}
        {required.contributionConsent ? <div className={styles.analyticsRow}>
          <span>Optional contribution</span>
          {contributionConsentLoading ? <span role="status">Loading…</span> : contributionConsentError && !contributionConsent
            ? <span><span role="alert">{contributionConsentError}</span> <button type="button" onClick={() => { setContributionConsentError(''); setContributionConsentReloadCount((count) => count + 1); }}>Try again</button></span>
            : contributionConsent ? <span>
              <span>{contributionConsent.status === 'GRANTED' ? 'Contribution allowed' : 'Not contributing'}</span>
              <button type="button" disabled={contributionConsentSaving} onClick={() => { void updateContributionConsent(); }}>
                {contributionConsentSaving ? 'Saving…' : contributionConsent.status === 'GRANTED' ? 'Withdraw' : 'Allow'}
              </button>
              {contributionConsentError ? <span role="alert">{contributionConsentError}</span> : null}
            </span> : <span role="status">No choice recorded</span>}
        </div> : null}
      </section>
      {required.authentication ? <AuthenticationSecuritySettings authentication={required.authentication} /> : null}
      </>
    );
}
