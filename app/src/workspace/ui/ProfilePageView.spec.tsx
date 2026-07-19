import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePageView } from './ProfilePageView';

function renderSubject(overrides: Partial<Parameters<typeof ProfilePageView>[0]> = {}) {
  render(
    <ProfilePageView
      required={{
        config: {},
        data: {
          accounts: [
            { id: 'a', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
          ],
          voiceMovementExperiment: {
            enabled: false,
            available: true,
            saving: false,
            disabled: false,
            description: 'Replaces the standard Add navigation with the experimental manual and voice movement controls.',
          },
        },
        state: {
          favoriteAccountId: 'a',
        },
        status: {
          disabled: false,
        },
        ...overrides.required,
      }}
      provided={{
        commands: {
          selectFavoriteAccount: () => undefined,
          addAccount: () => undefined,
          importBackup: () => undefined,
          exportBackup: () => undefined,
          manageTaxonomy: () => undefined,
          setVoiceMovementExperimentEnabled: vi.fn(),
        },
        ...overrides.provided,
      }}
    />,
  );
}

describe('ProfilePageView', () => {
  it('renders the experimental section with the voice movement entry switch', () => {
    renderSubject();

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enable voice movement entry experiment' })).toBeInTheDocument();
    expect(screen.getByText('Replaces the standard Add navigation with the experimental manual and voice movement controls.')).toBeInTheDocument();
  });

  it('reflects the current experiment state and disables while saving', () => {
    renderSubject({
      required: {
        config: {},
        data: {
          accounts: [
            { id: 'a', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
          ],
          voiceMovementExperiment: {
            enabled: true,
            available: true,
            saving: true,
            disabled: true,
            description: 'Saving experimental preference...',
          },
        },
        state: {
          favoriteAccountId: 'a',
        },
        status: {
          disabled: false,
        },
      },
    });

    expect(screen.getByRole('switch', { name: 'Enable voice movement entry experiment' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable voice movement entry experiment' })).toBeDisabled();
    expect(screen.getByText('Saving experimental preference...')).toBeInTheDocument();
  });

  it('explains when the feature is unavailable on the current device', () => {
    renderSubject({
      required: {
        config: {},
        data: {
          accounts: [
            { id: 'a', name: 'Main', type: 'cash', currency: 'USD', status: 'active' },
          ],
          voiceMovementExperiment: {
            enabled: true,
            available: false,
            saving: false,
            disabled: true,
            description: 'Voice movement entry is unavailable on this device.',
          },
        },
        state: {
          favoriteAccountId: 'a',
        },
        status: {
          disabled: false,
        },
      },
    });

    expect(screen.getByRole('switch', { name: 'Enable voice movement entry experiment' })).toBeDisabled();
    expect(screen.getByText('Voice movement entry is unavailable on this device.')).toBeInTheDocument();
  });
});
