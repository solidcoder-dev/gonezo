import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountSummaryView } from '../../account/application/accountView.types';
import type { ProfilePageViewProps } from '../ui/ProfilePageView.contract';
import { ProfilePage, type ProfilePageRequired } from './ProfilePage';

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
});
