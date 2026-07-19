import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovementVoiceCapturePresentationState, MovementVoicePermissionDialogPresentation } from './MovementVoiceEntry/useMovementVoiceCaptureModel';
import type { InterpretationRunExportOutcome } from './MovementVoiceEntry/InterpretationRunExporterPort';
import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import type { MovementVoiceEntryComponentProps } from './MovementVoiceEntryComponent.contract';
import { MovementVoiceEntryComponent } from './MovementVoiceEntryComponent';

type CapturedVoiceCaptureInput = {
  enabled: boolean;
  selectedAccount?: {
    id: string;
    name: string;
    currency: string;
  };
  voiceInterpretationContext: {
    currentDate: string;
    timeZone: string;
    locale: string;
    categoryOptions: ReadonlyArray<{
      id: string;
      label: string;
    }>;
  };
};

let capturedOnMovementEntryDraftReady: ((draft: MovementEntryDraft) => Promise<void> | void) | null = null;
let capturedOnCompleted: ((result: { diagnosticsAvailable: boolean }) => void) | null = null;
let capturedOnError: ((error: { message: string; diagnosticsAvailable?: boolean }) => void) | null = null;

const categorySourceTaxonomyListCategories = vi.fn();
const beginGesture = vi.fn();
const moveGesture = vi.fn();
const finishGesture = vi.fn();
const cancelGesture = vi.fn();
const stopLockedRecording = vi.fn();
const clearFailure = vi.fn();
const dismissPermissionDialog = vi.fn();
const requestPermissionAndRecord = vi.fn();
const openMicrophoneSettings = vi.fn();
const exportVoiceRun = vi.fn(async () => exportOutcome);

let voiceCaptureInputs: CapturedVoiceCaptureInput[] = [];
let exportOutcome: InterpretationRunExportOutcome | undefined = {
  kind: 'success',
  fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
};

let voicePresentationState: MovementVoiceCapturePresentationState = {
  kind: 'idle',
  headline: 'Add movement',
  locked: false,
  busy: false,
};

let voicePermissionDialogState: MovementVoicePermissionDialogPresentation = { open: false };

vi.mock('./MovementVoiceEntry/useMovementVoiceCaptureModel', () => ({
  useMovementVoiceCaptureModel: (input: CapturedVoiceCaptureInput & {
    onMovementEntryDraftReady?: (draft: MovementEntryDraft) => Promise<void> | void;
    onCompleted?: (result: { diagnosticsAvailable: boolean }) => void;
    onError?: (error: { message: string; diagnosticsAvailable?: boolean }) => void;
  }) => {
    voiceCaptureInputs.push(input);
    capturedOnMovementEntryDraftReady = input.onMovementEntryDraftReady ?? null;
    capturedOnCompleted = input.onCompleted ?? null;
    capturedOnError = input.onError ?? null;

    return {
      state: {
        presentation: voicePresentationState,
        navigationDimmed: false,
        addDisabled: false,
        permissionDialog: voicePermissionDialogState,
      },
      commands: {
        beginGesture,
        moveGesture,
        finishGesture,
        cancelGesture,
        stopLockedRecording,
        clearFailure,
        exportVoiceRun,
        dismissPermissionDialog,
        requestPermissionAndRecord,
        openMicrophoneSettings,
      },
    };
  },
}));

function makeProps(overrides: Partial<MovementVoiceEntryComponentProps> = {}): MovementVoiceEntryComponentProps {
  return {
    required: {
      context: {
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
          categorySource: {
            taxonomyListCategories: categorySourceTaxonomyListCategories,
          } as never,
        },
      },
      config: {
        enabled: true,
        selectedAccount: {
          id: 'account-main',
          name: 'Main account',
          currency: 'EUR',
        },
      },
      ...overrides.required,
    },
    provided: {
      events: {
        onMovementEntryDraftReady: vi.fn(),
        onError: vi.fn(),
        onNotice: vi.fn(),
        ...overrides.provided?.events,
      },
    },
  };
}

function renderSubject(propsOverrides: Partial<MovementVoiceEntryComponentProps> = {}) {
  const props = makeProps(propsOverrides);

  render(<MovementVoiceEntryComponent {...props} />);

  return props;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function latestVoiceCaptureInput() {
  return voiceCaptureInputs.at(-1);
}

beforeEach(() => {
  capturedOnMovementEntryDraftReady = null;
  capturedOnCompleted = null;
  capturedOnError = null;
  voiceCaptureInputs = [];
  voicePresentationState = {
    kind: 'idle',
    headline: 'Add movement',
    locked: false,
    busy: false,
  };
  voicePermissionDialogState = { open: false };
  exportOutcome = {
    kind: 'success',
    fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
  };
  categorySourceTaxonomyListCategories.mockReset();
  categorySourceTaxonomyListCategories.mockResolvedValue({ items: [] });
  beginGesture.mockReset();
  moveGesture.mockReset();
  finishGesture.mockReset();
  cancelGesture.mockReset();
  stopLockedRecording.mockReset();
  clearFailure.mockReset();
  dismissPermissionDialog.mockReset();
  requestPermissionAndRecord.mockReset();
  openMicrophoneSettings.mockReset();
  exportVoiceRun.mockClear();
  exportVoiceRun.mockImplementation(async () => exportOutcome);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('MovementVoiceEntryComponent', () => {
  it('does not request categories while disabled', async () => {
    const props = makeProps();
    props.required.config.enabled = false;

    render(<MovementVoiceEntryComponent {...props} />);

    await waitFor(() => expect(categorySourceTaxonomyListCategories).not.toHaveBeenCalled(), { timeout: 250 });
    expect(latestVoiceCaptureInput()?.enabled).toBe(false);
  });

  it('requests categories once when enabled and maps active categories to interpretation options', async () => {
    categorySourceTaxonomyListCategories.mockResolvedValue({
      items: [
        { id: 'cat-food', name: 'Food', status: 'active' },
        { id: 'cat-archive', name: 'Archived', status: 'archived' },
        { id: 'cat-books', name: 'Books', status: 'active' },
      ],
    });

    renderSubject();

    await waitFor(() => expect(categorySourceTaxonomyListCategories).toHaveBeenCalledTimes(1));
    expect(categorySourceTaxonomyListCategories).toHaveBeenCalledWith({ includeArchived: false });

    await waitFor(() => expect(latestVoiceCaptureInput()?.enabled).toBe(true));
    expect(latestVoiceCaptureInput()?.voiceInterpretationContext.categoryOptions).toEqual([
      { id: 'cat-food', label: 'Food' },
      { id: 'cat-books', label: 'Books' },
    ]);
  });

  it('keeps capture disabled while the initial category request is pending and enables it after success', async () => {
    const loadCategories = deferred<{
      items: Array<{ id: string; name: string; status: 'active' | 'archived' }>;
    }>();
    categorySourceTaxonomyListCategories.mockReturnValue(loadCategories.promise);

    renderSubject();

    await waitFor(() => expect(categorySourceTaxonomyListCategories).toHaveBeenCalledTimes(1));
    expect(latestVoiceCaptureInput()?.enabled).toBe(false);

    await act(async () => {
      loadCategories.resolve({
        items: [
          { id: 'cat-food', name: 'Food', status: 'active' },
        ],
      });
      await loadCategories.promise;
    });

    await waitFor(() => expect(latestVoiceCaptureInput()?.enabled).toBe(true));
  });

  it('emits a warning, settles with an empty category list and does not crash when loading fails', async () => {
    categorySourceTaxonomyListCategories.mockRejectedValueOnce(new Error('boom'));
    const props = renderSubject();

    await waitFor(() => expect(props.provided?.events?.onError).toHaveBeenCalledWith({
      message: 'Unable to load categories for voice capture.',
      tone: 'warning',
    }));
    expect(latestVoiceCaptureInput()?.voiceInterpretationContext.categoryOptions).toEqual([]);
    expect(latestVoiceCaptureInput()?.enabled).toBe(true);
  });

  it.each(['unmount', 'disable'] as const)('ignores a late category result after %s', async (mode) => {
    const loadCategories = deferred<{
      items: Array<{ id: string; name: string; status: 'active' | 'archived' }>;
    }>();
    categorySourceTaxonomyListCategories.mockReturnValue(loadCategories.promise);
    const props = makeProps();
    const renderResult = render(<MovementVoiceEntryComponent {...props} />);

    await waitFor(() => expect(categorySourceTaxonomyListCategories).toHaveBeenCalledTimes(1));

    if (mode === 'unmount') {
      renderResult.unmount();
    }

    if (mode === 'disable') {
      props.required.config.enabled = false;
      renderResult.rerender(<MovementVoiceEntryComponent {...props} />);
      expect(latestVoiceCaptureInput()?.enabled).toBe(false);
    }

    await act(async () => {
      loadCategories.resolve({
        items: [
          { id: 'cat-food', name: 'Food', status: 'active' },
        ],
      });
      await loadCategories.promise;
    });

    expect(props.provided?.events?.onError).not.toHaveBeenCalled();
  });

  it('builds runtime date, timezone and locale inside the component', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T12:34:56.000Z'));
    const timeZoneSpy = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Europe/London',
      locale: 'en-GB',
      hourCycle: 'h23',
    } as never);
    vi.stubGlobal('navigator', { language: 'en-GB' } as Navigator);
    categorySourceTaxonomyListCategories.mockResolvedValue({
      items: [
        { id: 'cat-food', name: 'Food', status: 'active' },
      ],
    });

    renderSubject();

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestVoiceCaptureInput()).toMatchObject({
      voiceInterpretationContext: {
        currentDate: '2026-07-19',
        timeZone: 'Europe/London',
        locale: 'en-GB',
        categoryOptions: [{ id: 'cat-food', label: 'Food' }],
      },
    });

    timeZoneSpy.mockRestore();
  });

  it('honors explicit runtime overrides for deterministic tests', async () => {
    categorySourceTaxonomyListCategories.mockResolvedValue({
      items: [
        { id: 'cat-food', name: 'Food', status: 'active' },
      ],
    });
    const props = makeProps();
    props.required.config.voiceInterpretationContext = {
      currentDate: '2026-07-15',
      timeZone: 'UTC',
      locale: 'fr-FR',
    };

    render(<MovementVoiceEntryComponent {...props} />);

    await waitFor(() => expect(latestVoiceCaptureInput()).toMatchObject({
      voiceInterpretationContext: {
        currentDate: '2026-07-15',
        timeZone: 'UTC',
        locale: 'fr-FR',
        categoryOptions: [{ id: 'cat-food', label: 'Food' }],
      },
    }));
  });

  it('forwards the interpreted draft with the selected account', async () => {
    const props = makeProps();

    render(<MovementVoiceEntryComponent {...props} />);

    await act(async () => {
      await capturedOnMovementEntryDraftReady?.({
        type: 'expense',
        amount: '34.80',
        occurredOn: '2026-07-14',
        note: 'Coffee with lunch',
        categoryId: 'cat-coffee',
        issues: [],
      });
    });

    expect(props.provided?.events?.onMovementEntryDraftReady).toHaveBeenCalledWith({
      account: {
        id: 'account-main',
        name: 'Main account',
        currency: 'EUR',
      },
      draft: {
        type: 'expense',
        amount: '34.80',
        occurredOn: '2026-07-14',
        note: 'Coffee with lunch',
        categoryId: 'cat-coffee',
        issues: [],
      },
    });
  });

  it('preserves the processing failure when the selected account is unavailable', async () => {
    const props = makeProps();
    props.required.config.selectedAccount = null;
    render(<MovementVoiceEntryComponent {...props} />);

    await expect(capturedOnMovementEntryDraftReady?.({
      amount: '12.50',
      occurredOn: '2026-07-14',
      note: 'Lunch',
      issues: [],
    })).rejects.toMatchObject({
      code: 'processing-failed',
      message: 'The selected account is no longer available. Select an account and try again.',
      recoverable: true,
    });
  });

  it('invokes the permission dialog actions and restores focus on dismiss', async () => {
    voicePermissionDialogState = {
      open: true,
      kind: 'request-access',
      title: 'Allow microphone access',
      description: 'Grant microphone access to record a voice draft.',
      safeActionLabel: 'Request permission and record',
      dismissActionLabel: 'Dismiss',
      busy: false,
    };
    render(<MovementVoiceEntryComponent {...makeProps()} />);

    const microphoneButton = screen.getByRole('button', { name: 'Record movement with voice' });
    microphoneButton.focus();

    fireEvent.click(screen.getByRole('button', { name: 'Request permission and record' }));
    expect(requestPermissionAndRecord).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismissPermissionDialog).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record movement with voice' })).toHaveFocus());
  });

  it('publishes notices and handles diagnostic export outcomes', async () => {
    const props = makeProps();

    render(<MovementVoiceEntryComponent {...props} />);

    await act(async () => {
      capturedOnError?.({
        message: 'Voice processing failed.',
        diagnosticsAvailable: true,
      });
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

    await act(async () => {
      notice.action?.run();
    });

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Export voice run' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Export ZIP' }));
    await waitFor(() => expect(props.provided?.events?.onNotice).toHaveBeenCalledWith({
      message: 'Diagnostic ZIP exported.',
      tone: 'success',
    }));

    await act(async () => {
      capturedOnCompleted?.({
        diagnosticsAvailable: true,
      });
    });

    expect(props.provided?.events?.onNotice).toHaveBeenCalledWith({
      message: 'Voice draft created. Review the interpreted values.',
      tone: 'info',
      action: {
        label: 'Download ZIP',
        run: expect.any(Function),
      },
    });
  });
});
