import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountSummaryView } from '../../account/application/accountView.types';
import type { ProfilePageViewProps } from '../ui/ProfilePageView.contract';
import { ProfilePage, type ProfilePageRequired } from './ProfilePage';
import { AuthenticationGate } from '../../authentication/application/AuthenticationGate';
import type { AuthenticationUseCases } from '../../authentication/application/authentication.port';
import { AuthenticationSessionProvider } from '../../authentication/application/authenticationSession';
import type { AnalyticsContributionConsent } from '../../macroAnalytics/domain/analyticsContributionConsent';
import type { AnalyticsContributionConsentPort } from '../../macroAnalytics/application/analyticsContributionConsent.port';

type ProfileModelState = {
  accounts: AccountSummaryView[];
  supportedCurrencies: string[];
  defaultAccountId: string | null;
  createFormOpen: boolean;
  createName: string;
  createCurrency: string;
  createOpeningBalance: string;
  creating: boolean;
  controlsDisabled: boolean;
};

let profileModelState: ProfileModelState;
let profilePageProps: ProfilePageViewProps | null = null;

vi.mock('../../ledger/application/ledgerGateway', () => ({
  createLedgerGateway: () => ({}),
}));

vi.mock('../../account/application/AccountHub/useAccountHubModel', () => ({
  useAccountHubModel: () => ({
    state: profileModelState,
    commands: {
      submitCreateAccount: vi.fn(),
      selectAccount: vi.fn(),
      restoreAccount: vi.fn(),
      setDefaultAccount: vi.fn(),
      clearDefaultAccount: vi.fn(),
      openCreateForm: vi.fn(),
      closeCreateForm: vi.fn(),
      setCreateName: vi.fn(),
      setCreateCurrency: vi.fn(),
      setCreateOpeningBalance: vi.fn(),
    },
  }),
}));

vi.mock('../ui/ProfilePageView', () => ({
  ProfilePageView: (props: ProfilePageViewProps) => {
    profilePageProps = props;
    return <div data-testid="profile-page-view" />;
  },
}));

function makeRequired(overrides: Partial<ProfilePageRequired> = {}): ProfilePageRequired {
  return {
    authentication: overrides.authentication,
    contributionConsent: overrides.contributionConsent,
    contributionConsentClock: overrides.contributionConsentClock,
    context: {
      core: {} as never,
      ...overrides.context,
    },
    config: {
      refreshSignal: false,
      voiceEntryAvailable: true,
      voiceWorkflowBusy: false,
      voiceMovementExperimentEnabled: false,
      voiceMovementExperimentLoading: false,
      voiceMovementExperimentSaving: false,
      ...overrides.config,
    },
  };
}

beforeEach(() => {
  profilePageProps = null;
  profileModelState = {
    accounts: [
      { id: 'favorite', name: 'Favorite account', type: 'cash', currency: 'EUR', status: 'active' },
      { id: 'fallback', name: 'Fallback account', type: 'cash', currency: 'USD', status: 'active' },
    ],
    supportedCurrencies: ['USD', 'EUR'],
    defaultAccountId: 'favorite',
    createFormOpen: false,
    createName: 'Main account',
    createCurrency: 'USD',
    createOpeningBalance: '',
    creating: false,
    controlsDisabled: false,
  };
});

describe('ProfilePage', () => {
  it.each(['GRANTED', 'DECLINED', 'WITHDRAWN'] as const)('allows updating a %s contribution choice', async (status) => {
    const port = new (class implements AnalyticsContributionConsentPort {
      decision: AnalyticsContributionConsent = { userId: 'user-A', status, noticeVersion: 1, decidedAt: '2026-09-18T10:00:00.000Z' };
      async get(userId: string) { return userId === 'user-A' ? this.decision : null; }
      async save(decision: AnalyticsContributionConsent) { this.decision = decision; }
    })();
    render(<MemoryRouter><AuthenticationSessionProvider session={{ userId: 'user-A', logout: async () => undefined }}>
      <ProfilePage required={makeRequired({ contributionConsent: port, contributionConsentClock: () => '2026-09-19T10:00:00.000Z' })} />
    </AuthenticationSessionProvider></MemoryRouter>);

    const action = status === 'GRANTED' ? 'Withdraw' : 'Allow';
    fireEvent.click(await screen.findByRole('button', { name: action }));

    await waitFor(() => expect(port.decision.status).toBe(status === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED'));
    expect(await screen.findByText(status === 'GRANTED' ? 'Not contributing' : 'Contribution allowed')).toBeInTheDocument();
  });

  it('keeps the current choice visible and retryable when saving a privacy change fails', async () => {
    const port = new (class implements AnalyticsContributionConsentPort {
      async get(userId: string) { return { userId, status: 'DECLINED', noticeVersion: 1, decidedAt: '2026-09-18T10:00:00.000Z' } as const; }
      async save() { throw new Error('storage unavailable'); }
    })();
    render(<MemoryRouter><AuthenticationSessionProvider session={{ userId: 'user-A', logout: async () => undefined }}>
      <ProfilePage required={makeRequired({ contributionConsent: port, contributionConsentClock: () => '2026-09-19T10:00:00.000Z' })} />
    </AuthenticationSessionProvider></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Allow' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('button', { name: 'Allow' })).toBeInTheDocument();
  });

  it('does not filter profile accounts from a currency query parameter', async () => {
    render(
      <MemoryRouter initialEntries={['/profile?currency=EUR']}>
        <ProfilePage required={makeRequired()} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(profilePageProps).not.toBeNull());
    expect(profilePageProps?.required.data.accounts).toHaveLength(2);
  });

  it('passes the experimental toggle model to the view', async () => {
    render(
      <MemoryRouter>
        <ProfilePage
          required={makeRequired({
            config: {
              refreshSignal: false,
              voiceEntryAvailable: true,
              voiceWorkflowBusy: false,
              voiceMovementExperimentEnabled: true,
              voiceMovementExperimentLoading: false,
              voiceMovementExperimentSaving: false,
            },
          })}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(profilePageProps).not.toBeNull());
    expect(profilePageProps?.required.data.voiceMovementExperiment).toEqual({
      enabled: true,
      available: true,
      saving: false,
      disabled: false,
      description: 'Replaces the standard Add navigation with the experimental manual and voice movement controls.',
    });
  });

  it('disables and explains the experiment when the workflow is busy or the device is unsupported', async () => {
    render(
      <MemoryRouter>
        <ProfilePage
          required={makeRequired({
            config: {
              refreshSignal: false,
              voiceEntryAvailable: false,
              voiceWorkflowBusy: true,
              voiceMovementExperimentEnabled: true,
              voiceMovementExperimentLoading: false,
              voiceMovementExperimentSaving: false,
            },
          })}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(profilePageProps).not.toBeNull());
    expect(profilePageProps?.required.data.voiceMovementExperiment).toEqual({
      enabled: true,
      available: false,
      saving: false,
      disabled: true,
      description: 'Voice movement entry is unavailable on this device.',
    });
  });

  it('forwards the toggle command through the profile actions', async () => {
    const onSetVoiceMovementExperimentEnabled = vi.fn();

    render(
      <MemoryRouter>
        <ProfilePage
          required={makeRequired({
            config: {
              refreshSignal: false,
              voiceEntryAvailable: true,
              voiceWorkflowBusy: false,
              voiceMovementExperimentEnabled: false,
              voiceMovementExperimentLoading: false,
              voiceMovementExperimentSaving: false,
            },
          })}
          provided={{
            events: {
              onSetVoiceMovementExperimentEnabled,
            },
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(profilePageProps).not.toBeNull());
    profilePageProps?.provided.commands.setVoiceMovementExperimentEnabled(true);
    expect(onSetVoiceMovementExperimentEnabled).toHaveBeenCalledWith(true);
  });

  it('shows authentication security settings on Profile', async () => {
    const authentication = {
      getAuthenticationState: async () => ({ status: 'authenticated', userId: 'alice' } as const),
      hasCredentials: async () => true,
      isDeviceUnlockAvailable: async () => true,
      isDeviceUnlockEnabled: async () => false,
    } as AuthenticationUseCases;

    render(
      <MemoryRouter>
        <AuthenticationGate required={{ authentication }}>
          <ProfilePage required={makeRequired({ authentication })} />
        </AuthenticationGate>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Security' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Password to enable device unlock')).toBeInTheDocument();
  });
});
