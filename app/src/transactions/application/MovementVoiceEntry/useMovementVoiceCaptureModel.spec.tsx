import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AppLifecyclePort, AppLifecycleState } from './AppLifecyclePort';
import type { CaptureVoiceInputPort } from './CaptureVoiceInput';
import type { MicrophonePermissionPort } from './MicrophonePermissionPort';
import type { InterpretationRunExporterPort, InterpretationRunExportOutcome } from './InterpretationRunExporterPort';
import type { MovementEntryDraft, MovementEntryDraftInterpreterPort } from './MovementEntryDraftInterpreterPort';
import type { InterpretMovementEntryDraftOutcome } from './MovementEntryDraftInterpreterPort';
import { useMovementVoiceCaptureModel } from './useMovementVoiceCaptureModel';
import type { TranscribeVoiceInputPort } from './TranscribeVoiceInput';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createLifecycle() {
  let listener: ((state: AppLifecycleState) => void) | null = null;
  return {
    subscribe: vi.fn((callback: (state: AppLifecycleState) => void) => {
      listener = callback;
      return () => {
        listener = null;
      };
    }),
    emit(state: AppLifecycleState) {
      listener?.(state);
    },
  } satisfies AppLifecyclePort & { emit(state: AppLifecycleState): void };
}

function createCaptureVoiceInput(overrides: Partial<CaptureVoiceInputPort> = {}): CaptureVoiceInputPort {
  return {
    start: vi.fn(async () => ({
      runId: '11111111-1111-1111-1111-111111111111',
      startedAt: 1_000,
    })),
    stop: vi.fn(async () => ({
      runId: '11111111-1111-1111-1111-111111111111',
      audioRef: '11111111-1111-1111-1111-111111111111' as never,
      mimeType: 'audio/wav',
      durationMs: 5_000,
      sizeBytes: 12_345,
    })),
    cancel: vi.fn(async () => undefined),
    discardRun: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createTranscribeVoiceInput(overrides: Partial<TranscribeVoiceInputPort> = {}): TranscribeVoiceInputPort {
  return {
    transcribe: vi.fn(async () => ({
      transcript: {
        text: 'Coffee with lunch',
      },
    })),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createInterpretMovementEntryDraft(overrides: Partial<MovementEntryDraftInterpreterPort> = {}): MovementEntryDraftInterpreterPort {
  const draft: MovementEntryDraft = {
    type: 'expense',
    amount: '12.50',
    occurredOn: '2026-07-14',
    note: 'Coffee with lunch',
    categoryId: 'cat-coffee',
    issues: [],
  };

  return {
    interpret: vi.fn(async () => ({
      kind: 'success' as const,
      draft,
    })),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createInterpretationRunExporter(overrides: Partial<InterpretationRunExporterPort> = {}): InterpretationRunExporterPort {
  return {
    exportRun: vi.fn(async (): Promise<InterpretationRunExportOutcome> => ({
      kind: 'success',
      fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
    } satisfies InterpretationRunExportOutcome)),
    ...overrides,
  };
}

function createMicrophonePermission(): MicrophonePermissionPort {
  return {
    getStatus: vi.fn(async () => 'granted' as const),
    request: vi.fn(async () => 'granted' as const),
    openSettings: vi.fn(async () => undefined),
  };
}

function renderSubject(overrides: Partial<Parameters<typeof useMovementVoiceCaptureModel>[0]> = {}) {
  const captureVoiceInput = overrides.captureVoiceInput ?? createCaptureVoiceInput();
  const transcribeVoiceInput = overrides.transcribeVoiceInput ?? createTranscribeVoiceInput();
  const interpretMovementEntryDraft = overrides.interpretMovementEntryDraft ?? createInterpretMovementEntryDraft();
  const interpretationRunExporter = overrides.interpretationRunExporter ?? createInterpretationRunExporter();
  const microphonePermission = overrides.microphonePermission ?? createMicrophonePermission();
  const lifecycle = (overrides.appLifecycle ?? createLifecycle()) as ReturnType<typeof createLifecycle>;
  const onMovementEntryDraftReady = overrides.onMovementEntryDraftReady ?? vi.fn(async () => undefined);
  const onCompleted = overrides.onCompleted ?? vi.fn();
  const onError = overrides.onError ?? vi.fn();

  const result = renderHook(() => useMovementVoiceCaptureModel({
    enabled: true,
    selectedAccount: { id: 'acc-1', name: 'Main', currency: 'USD' },
    clockNow: () => 2_500,
    captureVoiceInput,
    transcribeVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    microphonePermission,
    voiceInterpretationContext: {
      currentDate: '2026-07-14',
      timeZone: 'Europe/London',
      locale: 'en-GB',
      categoryOptions: [
        { id: 'cat-coffee', label: 'Coffee' },
      ],
    },
    appLifecycle: lifecycle,
    onMovementEntryDraftReady,
    onCompleted,
    onError,
    ...overrides,
  }));

  return {
    ...result,
    captureVoiceInput,
    transcribeVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    microphonePermission,
    lifecycle,
    onMovementEntryDraftReady,
    onCompleted,
    onError,
  };
}

describe('useMovementVoiceCaptureModel', () => {
  it('waits for capture, transcription, and interpretation cancellation before discarding the run', async () => {
    const events: string[] = [];
    const captureCancel = createDeferred<void>();
    const transcribeCancel = createDeferred<void>();
    const interpretCancel = createDeferred<void>();
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onError } = renderSubject({
      captureVoiceInput: createCaptureVoiceInput({
        cancel: vi.fn(() => {
          events.push('capture-cancel');
          return captureCancel.promise;
        }),
      }),
      transcribeVoiceInput: createTranscribeVoiceInput({
        cancel: vi.fn(() => {
          events.push('transcribe-cancel');
          return transcribeCancel.promise;
        }),
      }),
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        cancel: vi.fn(() => {
          events.push('interpret-cancel');
          return interpretCancel.promise;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    act(() => {
      void result.current.commands.cancelGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(events).toEqual(['capture-cancel', 'transcribe-cancel', 'interpret-cancel']);
    });
    expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
    expect(result.current.state.functionalState).toBe('cancelling');

    await act(async () => {
      captureCancel.resolve(undefined);
      transcribeCancel.resolve(undefined);
    });

    expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();

    await act(async () => {
      interpretCancel.resolve(undefined);
    });

    await waitFor(() => {
      expect(captureVoiceInput.discardRun).toHaveBeenCalledTimes(1);
    });
    expect(captureVoiceInput.discardRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(transcribeVoiceInput.cancel).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.cancel).toHaveBeenCalledTimes(1);
    expect(result.current.state.functionalState).toBe('idle');
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancels the post-stop pipeline and exports the preserved run after cancellation settles', async () => {
    const events: string[] = [];
    const captureCancel = createDeferred<void>();
    const transcribeCancel = createDeferred<void>();
    const interpretCancel = createDeferred<void>();
    const interpretationRunExporter = createInterpretationRunExporter({
      exportRun: vi.fn(async (): Promise<InterpretationRunExportOutcome> => ({
        kind: 'success',
        fileName: 'gonezo-voice-run-11111111-1111-1111-1111-111111111111.zip',
      })),
    });
    const { result, captureVoiceInput, onError } = renderSubject({
      interpretationRunExporter,
      captureVoiceInput: createCaptureVoiceInput({
        stop: vi.fn(async () => ({
          runId: '11111111-1111-1111-1111-111111111111',
          audioRef: '11111111-1111-1111-1111-111111111111' as never,
          mimeType: 'audio/wav',
          durationMs: 5_000,
          sizeBytes: 12_345,
        })),
        cancel: vi.fn(async () => {
          events.push('capture-cancel');
          return captureCancel.promise;
        }),
      }),
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          events.push('transcribe-start');
          return new Promise<never>(() => undefined);
        }),
        cancel: vi.fn(async () => {
          events.push('transcribe-cancel');
          return transcribeCancel.promise;
        }),
      }),
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async () => {
          events.push('interpret-start');
          return {
            kind: 'success' as const,
            draft: {
              type: 'expense',
              amount: '12.50',
              occurredOn: '2026-07-14',
              note: 'Coffee with lunch',
              categoryId: 'cat-coffee',
              issues: [],
            } satisfies MovementEntryDraft,
          } satisfies InterpretMovementEntryDraftOutcome;
        }),
        cancel: vi.fn(async () => {
          events.push('interpret-cancel');
          return interpretCancel.promise;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    act(() => {
      void result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('transcribing');
    });

    act(() => {
      void result.current.commands.cancelVoicePipeline();
    });

    await waitFor(() => {
      expect(events).toEqual(['transcribe-start', 'capture-cancel', 'transcribe-cancel', 'interpret-cancel']);
    });
    expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
    expect(interpretationRunExporter.exportRun).not.toHaveBeenCalled();
    expect(result.current.state.functionalState).toBe('cancelling');

    await act(async () => {
      captureCancel.resolve(undefined);
      transcribeCancel.resolve(undefined);
      interpretCancel.resolve(undefined);
    });

    await waitFor(() => {
      expect(interpretationRunExporter.exportRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });
    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('preserves the run when cancellation fails', async () => {
    const transcribeCancel = createDeferred<void>();
    const { result, captureVoiceInput, onError } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        cancel: vi.fn(() => transcribeCancel.promise),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    act(() => {
      void result.current.commands.cancelGesture({ pointerId: 1 });
    });

    await act(async () => {
      transcribeCancel.reject(new Error('native cancellation failed'));
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    expect(onError).toHaveBeenCalledWith({
      message: 'Voice processing could not be cancelled safely. Saved artifacts were preserved.',
    });
    expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
    expect(result.current.state.functionalState).toBe('idle');
  });

  it('discards the active run when the gesture is cancelled explicitly', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft } = renderSubject();

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.cancelGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.cancel).toHaveBeenCalledTimes(1);
    expect(captureVoiceInput.discardRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(transcribeVoiceInput.cancel).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.cancel).toHaveBeenCalledTimes(1);
  });

  it('completes a normal gesture with finishGesture and forwards the draft', async () => {
    const transcriptText = 'Gasté 34,80 euros ayer en Comida';
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, interpretationRunExporter, onMovementEntryDraftReady, onCompleted } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async (capturedAudio) => {
          expect(capturedAudio.runId).toBe('11111111-1111-1111-1111-111111111111');
          return {
            transcript: {
              text: transcriptText,
            },
          };
        }),
      }),
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (request) => {
          expect(request.runId).toBe('11111111-1111-1111-1111-111111111111');
          return {
            kind: 'success' as const,
            draft: {
              type: 'expense',
              amount: '34.80',
              occurredOn: '2026-07-14',
              note: transcriptText,
              categoryId: 'cat-food',
              issues: [],
            },
          } satisfies InterpretMovementEntryDraftOutcome;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });
    expect(captureVoiceInput.start).toHaveBeenCalledTimes(1);
    expect(captureVoiceInput.stop).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
    }));
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
      transcript: transcriptText,
    }));
    expect(onMovementEntryDraftReady).toHaveBeenCalledWith({
      type: 'expense',
      amount: '34.80',
      occurredOn: '2026-07-14',
      note: transcriptText,
      categoryId: 'cat-food',
      issues: [],
    });
    expect(onMovementEntryDraftReady).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith({
      diagnosticsAvailable: true,
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    expect(result.current.state.functionalState).toBe('idle');
  });

  it('opens the composer for a partial draft without inventing missing required fields', async () => {
    const interpretationRunExporter = createInterpretationRunExporter();
    const onMovementEntryDraftReady = vi.fn(async () => undefined);
    const onCompleted = vi.fn();
    const onError = vi.fn();
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft } = renderSubject({
      interpretationRunExporter,
      onMovementEntryDraftReady,
      onCompleted,
      onError,
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async () => ({
          kind: 'success' as const,
          draft: {
            issues: [],
          },
        })),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
    expect(onMovementEntryDraftReady).toHaveBeenCalledWith({
      issues: [],
    });
    expect(onMovementEntryDraftReady).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith({
      diagnosticsAvailable: true,
    });
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('fails when the draft callback loses the selected account context', async () => {
    const errorMessage = 'The selected account is no longer available. Select an account and try again.';
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      onMovementEntryDraftReady: vi.fn(async () => {
        throw {
          code: 'inference_failed',
          message: errorMessage,
          recoverable: true,
        };
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
    expect(onMovementEntryDraftReady).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({
      message: 'Movement interpretation failed.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();
  });

  it('treats model-unavailable as processing-unavailable and preserves the failed run for export', async () => {
    const interpretationRunExporter = createInterpretationRunExporter();
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      interpretationRunExporter,
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          return {
            failure: {
              code: 'model-unavailable',
              message: 'Local speech transcription model is unavailable.',
              recoverable: false,
              retryable: false,
            },
          } as const;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).not.toHaveBeenCalled();
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'Local speech transcription model is unavailable.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('treats model-corrupt as processing-unavailable without calling the interpreter', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          return {
            failure: {
              code: 'model-corrupt',
              message: 'Speech model asset failed integrity validation.',
              recoverable: false,
              retryable: false,
            },
          } as const;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).not.toHaveBeenCalled();
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'Speech model asset failed integrity validation.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();
  });

  it('treats native transcription failures as transcription-failed without showing the interpretation error', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          return {
            failure: {
              code: 'native-transcription-failed',
              message: 'Local speech transcription failed.',
              recoverable: true,
              retryable: true,
            },
          } as const;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).not.toHaveBeenCalled();
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'Local speech transcription failed.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();
  });

  it('treats an empty transcription as transcription-failed', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          return {
            failure: {
              code: 'transcription-empty',
              message: '',
              recoverable: true,
              retryable: true,
            },
          } as const;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).not.toHaveBeenCalled();
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'Voice transcription failed.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();
  });

  it('keeps interpretation failures as movement interpretation errors', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (): Promise<InterpretMovementEntryDraftOutcome> => {
          return {
            kind: 'failure',
            failure: {
              code: 'inference_failed',
              recoverable: true,
            },
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'Movement interpretation failed.',
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.errorMessage).toBeUndefined();
  });

  it.each([
    ['unsupported_device', 'Local voice processing is unavailable.'],
    ['malformed_output', 'Movement interpretation failed.'],
    ['inference_failed', 'Movement interpretation failed.'],
    ['no_usable_interpretation', 'The recording did not produce any usable fields.'],
  ] as const)('abandons processing after a rejected interpretation with %s', async (code, expectedMessage) => {
    const { result, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (): Promise<InterpretMovementEntryDraftOutcome> => {
          throw {
            code,
            message: expectedMessage,
            recoverable: code === 'unsupported_device' ? false : true,
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: expectedMessage,
      diagnosticsAvailable: true,
    });
    expect(result.current.state.presentation.kind).toBe('idle');
  });

  it('keeps the failed run available for diagnostics export and uses that run id', async () => {
    const interpretationRunExporter = createInterpretationRunExporter();
    const { result, interpretMovementEntryDraft } = renderSubject({
      interpretationRunExporter,
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (): Promise<InterpretMovementEntryDraftOutcome> => {
          return {
            kind: 'failure',
            failure: {
              code: 'inference_failed',
              recoverable: true,
            },
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
  });

  it('keeps the failed run when export is cancelled', async () => {
    const interpretationRunExporter = createInterpretationRunExporter({
      exportRun: vi.fn(async (): Promise<InterpretationRunExportOutcome> => ({ kind: 'cancelled' })),
    });
    const { result } = renderSubject({
      interpretationRunExporter,
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (): Promise<InterpretMovementEntryDraftOutcome> => {
          return {
            kind: 'failure',
            failure: {
              code: 'inference_failed',
              recoverable: true,
            },
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(interpretationRunExporter.exportRun).toHaveBeenCalledTimes(2);
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(result.current.state.presentation.supportingText).toBe('Hold the microphone to record a voice draft.');
  });

  it('reports export failures through the existing error channel', async () => {
    const onError = vi.fn();
    const interpretationRunExporter = createInterpretationRunExporter({
      exportRun: vi.fn(async (): Promise<InterpretationRunExportOutcome> => ({
        kind: 'failure',
        failure: {
          code: 'export-failed',
          message: 'The ZIP could not be written.',
          recoverable: true,
        },
      })),
    });
    const { result } = renderSubject({
      interpretationRunExporter,
      onError,
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (): Promise<InterpretMovementEntryDraftOutcome> => {
          return {
            kind: 'failure',
            failure: {
              code: 'inference_failed',
              recoverable: true,
            },
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });

    expect(onError).toHaveBeenCalledWith({
      message: 'The ZIP could not be written.',
      diagnosticsAvailable: true,
    });
  });

  it('stops after no-speech detection without calling the interpreter or opening the composer', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady, onError } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          return {
            failure: {
              code: 'no-speech-detected',
              message: 'No speech was detected in the recording.',
              recoverable: true,
              retryable: true,
            },
          } as const;
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.stop).toHaveBeenCalledTimes(1);
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).not.toHaveBeenCalled();
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith({
      message: 'No speech was detected in the recording.',
      diagnosticsAvailable: true,
    });

    expect(result.current.state.functionalState).toBe('idle');
  });

  it('clears a failed run before starting a new recording', async () => {
    const interpretationRunExporter = createInterpretationRunExporter();
    let transcribeCallCount = 0;
    const { result, interpretMovementEntryDraft } = renderSubject({
      interpretationRunExporter,
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(async (request): Promise<InterpretMovementEntryDraftOutcome> => {
          if (request.transcript.includes('Second')) {
            return {
              kind: 'success',
              draft: {
                type: 'expense',
                amount: '12.50',
                occurredOn: '2026-07-14',
                note: request.transcript,
                categoryId: 'cat-coffee',
                issues: [],
              },
            } satisfies InterpretMovementEntryDraftOutcome;
          }

          return {
            kind: 'failure',
            failure: {
              code: 'inference_failed',
              recoverable: true,
            },
          };
        }),
      }),
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => {
          transcribeCallCount += 1;
          return {
            transcript: {
              text: transcribeCallCount === 1 ? 'First run' : 'Second run',
            },
          };
        }),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });
    await waitFor(() => expect(result.current.state.functionalState).toBe('recording'));
    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 1 });
    });
    await waitFor(() => expect(result.current.state.functionalState).toBe('idle'));
    await act(async () => {
      await result.current.commands.exportVoiceRun();
    });
    expect(interpretationRunExporter.exportRun).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 2, clientX: 10, clientY: 10 });
    });

    await waitFor(() => expect(result.current.state.functionalState).toBe('recording'));

    await act(async () => {
      await result.current.commands.finishGesture({ pointerId: 2 });
    });

    await waitFor(() => expect(result.current.state.functionalState).toBe('idle'));
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(2);
  });

  it('discards the active run when swipe cancellation crosses the horizontal threshold', async () => {
    const { result, captureVoiceInput } = renderSubject();

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    await act(async () => {
      await result.current.commands.moveGesture({ pointerId: 1, clientX: -100, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    expect(captureVoiceInput.discardRun).toHaveBeenCalledTimes(1);
  });

  it('cancels in-flight work on unmount without discarding a captured run', async () => {
    const { result, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, unmount } = renderSubject();

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    unmount();

    await waitFor(() => {
      expect(captureVoiceInput.cancel).toHaveBeenCalledTimes(1);
    });
    expect(transcribeVoiceInput.cancel).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.cancel).toHaveBeenCalledTimes(1);
    expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
  });

  it('ignores transcription results that arrive after cancellation', async () => {
    const transcribeDeferred = createDeferred<{ transcript: { text: string } }>();
    const { result, lifecycle, captureVoiceInput, transcribeVoiceInput, onMovementEntryDraftReady } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(() => transcribeDeferred.promise),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    act(() => {
      void result.current.commands.stopLockedRecording();
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('transcribing');
    });

    act(() => {
      lifecycle.emit('inactive');
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    await act(async () => {
      transcribeDeferred.resolve({ transcript: { text: 'Late transcript' } });
    });

    await waitFor(() => {
      expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
    });
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(result.current.state.functionalState).toBe('idle');
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
  });

  it('ignores interpretation results that arrive after cancellation', async () => {
    const interpretationDeferred = createDeferred<{ kind: 'success'; draft: MovementEntryDraft }>();
    const { result, lifecycle, captureVoiceInput, transcribeVoiceInput, interpretMovementEntryDraft, onMovementEntryDraftReady } = renderSubject({
      transcribeVoiceInput: createTranscribeVoiceInput({
        transcribe: vi.fn(async () => ({ transcript: { text: 'Late interpretation' } })),
      }),
      interpretMovementEntryDraft: createInterpretMovementEntryDraft({
        interpret: vi.fn(() => interpretationDeferred.promise),
      }),
    });

    await act(async () => {
      await result.current.commands.beginGesture({ pointerId: 1, clientX: 10, clientY: 10 });
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('recording');
    });

    act(() => {
      void result.current.commands.stopLockedRecording();
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('processing');
    });

    act(() => {
      lifecycle.emit('inactive');
    });

    await waitFor(() => {
      expect(result.current.state.functionalState).toBe('idle');
    });

    await act(async () => {
      interpretationDeferred.resolve({
        kind: 'success',
        draft: {
          type: 'expense',
          amount: '12.50',
          occurredOn: '2026-07-14',
          note: 'Late interpretation',
          categoryId: 'cat-coffee',
          issues: [],
        },
      });
    });

    await waitFor(() => {
      expect(captureVoiceInput.discardRun).not.toHaveBeenCalled();
    });
    expect(onMovementEntryDraftReady).not.toHaveBeenCalled();
    expect(result.current.state.functionalState).toBe('idle');
    expect(result.current.state.presentation.kind).toBe('idle');
    expect(transcribeVoiceInput.transcribe).toHaveBeenCalledTimes(1);
    expect(interpretMovementEntryDraft.interpret).toHaveBeenCalledTimes(1);
  });
});
