import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MovementDockNavigationComponent } from './MovementDockNavigationComponent';
import type { MovementQuickActionComponentProps } from './MovementQuickActionComponent.contract';
import type { MovementVoiceCapturePresentationState } from './MovementVoiceEntry/useMovementVoiceCaptureModel';
import type { InterpretationRunExportOutcome } from './MovementVoiceEntry/InterpretationRunExporterPort';

let capturedVoiceOnError: ((error: { message: string; diagnosticsAvailable?: boolean }) => void) | null = null;
let capturedVoiceOnCompleted: ((result: { diagnosticsAvailable: boolean }) => void) | null = null;
let capturedDockCommands: Record<string, unknown> | null = null;
const exportVoiceRun = vi.fn(async () => undefined as InterpretationRunExportOutcome | undefined);
let exportOutcome: InterpretationRunExportOutcome | undefined = {
  kind: 'success',
  fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
};

vi.mock('./useMovementQuickActionModel', () => ({
  useMovementQuickActionModel: () => ({
    required: {
      state: {
        accounts: [],
        selectedAccountId: 'account-main',
        selectedAccountName: 'Main account',
        selectedMovementType: 'expense',
        draftOpen: false,
        accountSelectorOpen: false,
        typeSelectorOpen: false,
      },
      status: {
        loading: false,
        disabled: false,
      },
    },
    provided: {
      commands: {
        openDraft: vi.fn(),
        closeDraft: vi.fn(),
        expandDraft: vi.fn(),
        toggleAccountSelector: vi.fn(),
        toggleTypeSelector: vi.fn(),
        closeAccountSelector: vi.fn(),
        closeTypeSelector: vi.fn(),
        selectAccount: vi.fn(),
        selectMovementType: vi.fn(),
      },
    },
  }),
}));

let voiceCaptureState: MovementVoiceCapturePresentationState = {
  kind: 'idle' as const,
  headline: 'Add movement',
  locked: false,
  busy: false,
};

vi.mock('./MovementVoiceEntry/useMovementVoiceCaptureModel', () => ({
  useMovementVoiceCaptureModel: (input: {
    onError?: (error: { message: string; diagnosticsAvailable?: boolean }) => void;
    onCompleted?: (result: { diagnosticsAvailable: boolean }) => void;
  }) => {
    capturedVoiceOnError = input.onError ?? null;
    capturedVoiceOnCompleted = input.onCompleted ?? null;
    return {
      state: {
        presentation: voiceCaptureState,
        navigationDimmed: false,
        addDisabled: false,
        permissionDialog: { open: false },
      },
      commands: {
        beginGesture: vi.fn(),
        moveGesture: vi.fn(),
        finishGesture: vi.fn(),
        cancelGesture: vi.fn(),
        stopLockedRecording: vi.fn(),
        clearFailure: vi.fn(),
        exportVoiceRun,
        dismissPermissionDialog: vi.fn(),
        requestPermissionAndRecord: vi.fn(),
        openMicrophoneSettings: vi.fn(),
      },
    };
  },
}));

vi.mock('../ui/MovementDockNavigation/MovementDockNavigationView', () => ({
  MovementDockNavigationView: (props: { provided: { commands: Record<string, unknown> } }) => {
    capturedDockCommands = props.provided.commands;
    return <div data-testid="dock-navigation" />;
  },
}));

vi.mock('../ui/MovementDockNavigation/MovementVoicePermissionDialog', () => ({
  MovementVoicePermissionDialog: () => null,
}));

beforeEach(() => {
  voiceCaptureState = {
    kind: 'idle',
    headline: 'Add movement',
    locked: false,
    busy: false,
  };
  exportVoiceRun.mockReset();
  exportOutcome = {
    kind: 'success',
    fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
  };
  capturedVoiceOnError = null;
  capturedVoiceOnCompleted = null;
  capturedDockCommands = null;
});

function makeProps(overrides: Partial<MovementQuickActionComponentProps> = {}): MovementQuickActionComponentProps {
  return {
    required: {
      context: {
        core: {
          ledgerListAccounts: vi.fn(),
          preferencesGet: vi.fn(),
        } as never,
        voiceEntry: {
          enabled: true,
          captureVoiceInput: {
            start: vi.fn(),
            stop: vi.fn(),
            cancel: vi.fn(),
            discardRun: vi.fn(),
          } as never,
          transcribeVoiceInput: {
            transcribe: vi.fn(),
            cancel: vi.fn(),
          } as never,
          interpretMovementEntryDraft: {
            interpret: vi.fn(),
            cancel: vi.fn(),
          } as never,
          microphonePermission: {
            getStatus: vi.fn(),
            request: vi.fn(),
            openSettings: vi.fn(),
          } as never,
          appLifecycle: undefined,
        },
      },
      config: {
        enabled: true,
        refreshSignal: false,
        voiceInterpretationContext: {
          currentDate: '2026-07-15',
          timeZone: 'Europe/London',
          locale: 'en-GB',
          categoryOptions: [],
        },
      },
      ...overrides.required,
    },
    provided: {
      events: {
        onCreateMovementRequested: vi.fn(),
        onMovementEntryDraftReady: vi.fn(),
        onError: vi.fn(),
        onNotice: vi.fn(),
        ...overrides.provided?.events,
      },
    },
  };
}

describe('MovementDockNavigationComponent', () => {
  it('publishes a warning notice with a Download ZIP action when diagnostics are available', async () => {
    const props = makeProps();

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnError).toBeInstanceOf(Function));

    capturedVoiceOnError?.({
      message: 'Voice processing failed.',
      diagnosticsAvailable: true,
    });

    expect(props.provided?.events?.onError).toHaveBeenCalledWith({
      message: 'Voice processing failed.',
      tone: 'warning',
      action: {
        label: 'Download ZIP',
        run: expect.any(Function),
      },
    });

    const notice = (props.provided?.events?.onError as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      action?: { run: () => void };
    };
    expect(notice.action).toBeDefined();

    act(() => {
      notice.action?.run();
    });

    expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument();
    expect(exportVoiceRun).not.toHaveBeenCalled();
  });

  it('publishes an info notice with a Download ZIP action after a successful draft', async () => {
    const props = makeProps();

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnCompleted).toBeInstanceOf(Function));

    capturedVoiceOnCompleted?.({
      diagnosticsAvailable: true,
    });

    expect(props.provided?.events?.onNotice).toHaveBeenCalledWith({
      message: 'Voice draft created. Review the interpreted values.',
      tone: 'info',
      action: {
        label: 'Download ZIP',
        run: expect.any(Function),
      },
    });

    const notice = (props.provided?.events?.onNotice as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      action?: { run: () => void };
    };

    act(() => {
      notice.action?.run();
    });

    expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument();
  });

  it('confirms diagnostic export before opening the system picker', async () => {
    const props = makeProps();

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnError).toBeInstanceOf(Function));

    capturedVoiceOnError?.({
      message: 'Voice processing failed.',
      diagnosticsAvailable: true,
    });

    const notice = (props.provided?.events?.onError as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      action?: { run: () => void };
    };

    await act(async () => {
      notice.action?.run();
    });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Export ZIP' }));

    expect(exportVoiceRun).toHaveBeenCalledTimes(1);
    expect(exportVoiceRun).toHaveBeenCalledWith();
  });

  it('does not offer diagnostics when the failure happened before a run was created', async () => {
    const props = makeProps();

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnError).toBeInstanceOf(Function));

    capturedVoiceOnError?.({
      message: 'Microphone permission was denied.',
      diagnosticsAvailable: false,
    });

    expect(props.provided?.events?.onError).toHaveBeenCalledWith({
      message: 'Microphone permission was denied.',
      tone: 'warning',
      action: undefined,
    });
  });

  it('closes the sheet without exporting when the user cancels', async () => {
    const props = makeProps();

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnError).toBeInstanceOf(Function));

    capturedVoiceOnError?.({
      message: 'Voice processing failed.',
      diagnosticsAvailable: true,
    });

    const notice = (props.provided?.events?.onError as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      action?: { run: () => void };
    };

    await act(async () => {
      notice.action?.run();
    });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(exportVoiceRun).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Export voice run' })).not.toBeInTheDocument());
  });

  it('uses the latest failed run id when exporting and clears it after success', async () => {
    const props = makeProps();
    exportOutcome = {
      kind: 'success',
      fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
    };
    exportVoiceRun.mockImplementation(async () => exportOutcome);

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...props} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedVoiceOnError).toBeInstanceOf(Function));

    capturedVoiceOnError?.({
      message: 'Voice processing failed.',
      diagnosticsAvailable: true,
    });

    const notice = (props.provided?.events?.onError as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      action?: { run: () => void };
    };

    await act(async () => {
      notice.action?.run();
    });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Export ZIP' }));

    await waitFor(() => expect(props.provided?.events?.onNotice).toHaveBeenCalledWith({
      message: 'Diagnostic ZIP exported.',
      tone: 'success',
    }));
  });

  it('does not expose openExportDiagnostics to the dock', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <MovementDockNavigationComponent {...makeProps()} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(capturedDockCommands).not.toBeNull());
    expect(capturedDockCommands).not.toHaveProperty('openExportDiagnostics');
  });
});
