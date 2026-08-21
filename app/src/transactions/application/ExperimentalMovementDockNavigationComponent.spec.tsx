import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMovementDockNavigationComponent } from './ExperimentalMovementDockNavigationComponent';
import type { ExperimentalMovementDockNavigationComponentProps } from './ExperimentalMovementDockNavigationComponent.contract';
import type { MovementVoiceEntryContext } from './MovementVoiceEntry/movementVoiceEntryContext';

function createVoiceEntry() {
  const voiceEntry = {
    enabled: true,
    captureVoiceInput: {
      start: vi.fn(async () => ({ runId: 'run-1', startedAt: Date.now() })),
      stop: vi.fn(async () => ({ runId: 'run-1', audioRef: 'audio-1' as never, mimeType: 'audio/wav', durationMs: 1_000, sizeBytes: 64 })),
      cancel: vi.fn(async () => undefined),
      discardRun: vi.fn(async () => undefined),
    },
    transcribeVoiceInput: {
      transcribe: vi.fn(),
      cancel: vi.fn(async () => undefined),
    },
    interpretMovementEntryDraft: {
      interpret: vi.fn(),
      cancel: vi.fn(async () => undefined),
    },
    microphonePermission: {
      getStatus: vi.fn(async () => 'granted' as const),
      request: vi.fn(async () => 'granted' as const),
      openSettings: vi.fn(async () => undefined),
    },
    appLifecycle: undefined,
    categorySource: {
      taxonomyListCategories: vi.fn(async () => ({ items: [] })),
    },
  } as unknown as MovementVoiceEntryContext;
  return voiceEntry;
}

function renderSubject(coreOverrides: Partial<ExperimentalMovementDockNavigationComponentProps['required']['context']['core']> = {}) {
  const voiceEntry = createVoiceEntry();
  const core = {
    ledgerListAccounts: vi.fn(async () => ({
      items: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' }],
    })),
    preferencesGet: vi.fn(async () => ({ defaultAccountId: 'account-1' })),
    ...coreOverrides,
  };

  render(
    <MemoryRouter>
      <ExperimentalMovementDockNavigationComponent
        required={{
          context: { core, voiceEntry },
          config: { enabled: true, refreshSignal: false },
        }}
      />
    </MemoryRouter>,
  );

  return { core, voiceEntry };
}

describe('ExperimentalMovementDockNavigationComponent', () => {
  it('starts recording from a tap after account and category readiness completes', async () => {
    const { voiceEntry } = renderSubject();

    const microphone = await screen.findByRole('button', { name: 'Record movement with voice' });
    await waitFor(() => expect(microphone).not.toBeDisabled());

    fireEvent.click(microphone);

    await waitFor(() => expect(voiceEntry.microphonePermission.getStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(voiceEntry.captureVoiceInput.start).toHaveBeenCalledTimes(1));
    expect(voiceEntry.captureVoiceInput.cancel).not.toHaveBeenCalled();
  });

  it('keeps the microphone disabled while the account is still loading', async () => {
    let resolveAccounts: ((value: { items: Array<{ id: string; name: string; type: string; currency: string; status: string }> }) => void) | undefined;
    const accounts = new Promise<{ items: Array<{ id: string; name: string; type: string; currency: string; status: string }> }>((resolve) => {
      resolveAccounts = resolve;
    });
    renderSubject({ ledgerListAccounts: vi.fn(() => accounts) });

    const microphone = await screen.findByRole('button', { name: 'Record movement with voice' });
    expect(microphone).toBeDisabled();

    resolveAccounts?.({
      items: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' }],
    });

    await waitFor(() => expect(microphone).not.toBeDisabled());
  });

  it('keeps recording when the parent recreates dock events after busy state changes', async () => {
    const voiceEntry = createVoiceEntry();
    type CategoryResult = { items: Array<{ id: string; name: string; status: 'active' | 'archived' }> };
    let resolveInitialCategories: ((value: CategoryResult) => void) | undefined;
    let categoryCallCount = 0;
    const initialCategories = new Promise<CategoryResult>((resolve) => {
      resolveInitialCategories = resolve;
    });
    voiceEntry.categorySource.taxonomyListCategories = vi.fn(() => {
      categoryCallCount += 1;
      return categoryCallCount === 1
        ? initialCategories
        : new Promise<CategoryResult>(() => undefined);
    });
    const core = {
      ledgerListAccounts: vi.fn(async () => ({
        items: [{ id: 'account-1', name: 'Main', type: 'cash', currency: 'USD', status: 'active' }],
      })),
      preferencesGet: vi.fn(async () => ({ defaultAccountId: 'account-1' })),
    };
    const busyChanges: boolean[] = [];
    function Host() {
      const [, setRenderVersion] = useState(0);
      const hostVoiceEntry = {
        ...voiceEntry,
        categorySource: { ...voiceEntry.categorySource },
      };
      return (
        <ExperimentalMovementDockNavigationComponent
          required={{
            context: { core, voiceEntry: hostVoiceEntry },
            config: { enabled: true, refreshSignal: false },
          }}
          provided={{
            events: {
              onBusyChanged: (busy) => {
                busyChanges.push(busy);
                if (busy) {
                  setRenderVersion(1);
                }
              },
            },
          }}
        />
      );
    }

    render(
      <MemoryRouter>
        <Host />
      </MemoryRouter>,
    );

    const microphone = await screen.findByRole('button', { name: 'Record movement with voice' });
    resolveInitialCategories?.({ items: [] });
    await waitFor(() => expect(microphone).not.toBeDisabled());

    fireEvent.click(microphone);

    await waitFor(() => expect(voiceEntry.captureVoiceInput.start).toHaveBeenCalledTimes(1));
    expect(busyChanges).toContain(true);
    await waitFor(() => expect(voiceEntry.categorySource.taxonomyListCategories).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Stop locked voice recording' })).toBeInTheDocument();
  });
});
