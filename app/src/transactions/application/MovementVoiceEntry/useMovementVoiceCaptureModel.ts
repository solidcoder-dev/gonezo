import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppLifecyclePort, AppLifecycleState } from './AppLifecyclePort';
import type { MicrophonePermissionPort } from './MicrophonePermissionPort';
import type { CaptureFailure, VoiceCaptureFunctionalState } from './movementVoiceCapture.types';
import { MAX_RECORDING_DURATION_MS } from './movementVoiceCapturePolicy';
import type { CaptureVoiceInputPort } from './CaptureVoiceInput';
import type {
  MovementEntryCategoryOption,
  MovementEntryDraft,
  MovementEntryDraftInterpreterPort,
} from './MovementEntryDraftInterpreterPort';
import type { InterpretationRunExportOutcome, InterpretationRunExporterPort } from './InterpretationRunExporterPort';
import type { TranscribeVoiceInputPort } from './TranscribeVoiceInput';
import { browserMovementVoiceCaptureTimers, type MovementVoiceCaptureTimers } from './voiceCaptureTimers';

type SelectedVoiceAccount = {
  id: string;
  name: string;
  currency: string;
};

export type MovementVoiceInterpretationContext = {
  currentDate: string;
  timeZone: string;
  locale: string;
  categoryOptions: ReadonlyArray<MovementEntryCategoryOption>;
};

type BeginGestureInput = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type MoveGestureInput = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type FinishGestureInput = {
  pointerId: number;
};

type FunctionalState =
  | { kind: 'idle' }
  | { kind: 'requesting-permission' }
  | { kind: 'recording'; startedAt: number }
  | { kind: 'locked'; startedAt: number }
  | { kind: 'cancelling' }
  | { kind: 'stopping'; startedAt: number }
  | { kind: 'transcribing'; startedAt: number }
  | { kind: 'processing'; startedAt: number }
  | { kind: 'draft-ready'; startedAt: number }
  | { kind: 'failed'; failure: CaptureFailure };

type PermissionDialogState =
  | { kind: 'closed' }
  | { kind: 'request-access' }
  | { kind: 'open-settings' };

type UseMovementVoiceCaptureModelInput = {
  enabled: boolean;
  selectedAccount?: SelectedVoiceAccount;
  clockNow: () => number;
  captureVoiceInput: CaptureVoiceInputPort;
  transcribeVoiceInput: TranscribeVoiceInputPort;
  interpretMovementEntryDraft: MovementEntryDraftInterpreterPort;
  interpretationRunExporter?: InterpretationRunExporterPort;
  microphonePermission: MicrophonePermissionPort;
  voiceInterpretationContext: MovementVoiceInterpretationContext;
  appLifecycle?: AppLifecyclePort;
  timers?: MovementVoiceCaptureTimers;
  onMovementEntryDraftReady?: (draft: MovementEntryDraft) => Promise<void> | void;
  onCompleted?: (result: {
    diagnosticsAvailable: boolean;
  }) => void;
  onError?: (error: {
    message: string;
    diagnosticsAvailable?: boolean;
  }) => void;
};

const CANCEL_THRESHOLD_PX = 72;
const LOCK_THRESHOLD_PX = 64;
const TIMER_REFRESH_MS = 250;
const UNSAFE_CANCELLATION_MESSAGE = 'Voice processing could not be cancelled safely. Saved artifacts were preserved.';
const TRANSCRIPTION_UNAVAILABLE_CODES = new Set([
  'model-unavailable',
  'model-corrupt',
  'transcription-unavailable',
]);
const TRANSCRIPTION_FAILED_CODES = new Set([
  'audio-not-found',
  'invalid-audio',
  'native-transcription-failed',
  'transcription-empty',
]);
const INTERPRETATION_UNAVAILABLE_CODES = new Set([
  'model_unavailable',
  'model_corrupt',
  'unsupported_device',
]);

type ExportableVoiceRun = Readonly<{
  runId: string;
  outcome: 'success' | 'failure';
}>;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function isOperationalState(state: FunctionalState): boolean {
  return state.kind === 'requesting-permission'
    || state.kind === 'recording'
    || state.kind === 'locked'
    || state.kind === 'cancelling'
    || state.kind === 'stopping'
    || state.kind === 'transcribing'
    || state.kind === 'processing'
    || state.kind === 'draft-ready';
}

function isRecordingState(state: FunctionalState): state is Extract<FunctionalState, { kind: 'recording' | 'locked' }> {
  return state.kind === 'recording' || state.kind === 'locked';
}

function isPostStopCancelableState(state: FunctionalState): state is Extract<FunctionalState, { kind: 'stopping' | 'transcribing' | 'processing' | 'cancelling' }> {
  return state.kind === 'stopping' || state.kind === 'transcribing' || state.kind === 'processing' || state.kind === 'cancelling';
}

function mapProcessingFailure(error: unknown): CaptureFailure {
  const failure = error as { code?: string; message?: string; recoverable?: boolean };
  const code = failure?.code;
  if (code && TRANSCRIPTION_UNAVAILABLE_CODES.has(code)) {
    return {
      code: 'processing-unavailable',
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'Local voice transcription is unavailable.',
    };
  }
  if (code && TRANSCRIPTION_FAILED_CODES.has(code)) {
    return {
      code: 'transcription-failed',
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'Voice transcription failed.',
    };
  }
  if (code && INTERPRETATION_UNAVAILABLE_CODES.has(code)) {
    return {
      code: 'processing-unavailable',
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'Local voice processing is unavailable.',
    };
  }
  if (
    code === 'no-speech-detected'
    || code === 'transcription-invalid-output'
    || code === 'unsupported-transcription-language'
    || code === 'artifact-storage-failed'
  ) {
    return {
      code,
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'Voice transcription failed.',
    } as CaptureFailure;
  }
  if (code === 'interpretation_cancelled' || code === 'transcription-cancelled' || code === 'cancelled') {
    return {
      code: 'capture-cancelled',
      message: 'Voice processing was cancelled.',
    };
  }
  if (code === 'no_usable_interpretation') {
    return {
      code: 'no_usable_interpretation',
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'The recording did not produce any usable fields.',
    };
  }
  if (code === 'interpretation-incomplete') {
    return {
      code: 'interpretation-incomplete',
      message: typeof failure?.message === 'string' && failure.message.trim()
        ? failure.message
        : 'The recording was understood, but the amount or movement type could not be identified.',
    };
  }
  if (code === 'invalid_input' || code === 'contract_version_unsupported' || code === 'schema_incompatible' || code === 'output_invalid' || code === 'malformed_output' || code === 'inference_failed') {
    return {
      code: 'processing-failed',
      message: 'Movement interpretation failed.',
    };
  }
  return {
    code: 'processing-failed',
    message: 'Movement interpretation failed.',
  };
}

export type MovementVoiceCapturePresentationState = {
  kind: VoiceCaptureFunctionalState;
  elapsedLabel?: string;
  headline: string;
  supportingText?: string;
  errorMessage?: string;
  locked: boolean;
  busy: boolean;
};

export type MovementVoicePermissionDialogPresentation =
  | { open: false }
  | {
      open: true;
      kind: 'request-access' | 'open-settings';
      title: string;
      description: string;
      safeActionLabel: string;
      dismissActionLabel: string;
      busy: boolean;
    };

export function useMovementVoiceCaptureModel(input: UseMovementVoiceCaptureModelInput) {
  const {
    enabled,
    selectedAccount,
    clockNow,
    captureVoiceInput,
    transcribeVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    microphonePermission,
    voiceInterpretationContext,
    appLifecycle,
    timers = browserMovementVoiceCaptureTimers,
    onMovementEntryDraftReady,
    onCompleted,
    onError,
  } = input;
  const [functionalState, setFunctionalState] = useState<FunctionalState>({ kind: 'idle' });
  const [exportableRun, setExportableRun] = useState<ExportableVoiceRun | null>(null);
  const [isExportingDiagnostics, setIsExportingDiagnostics] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState<PermissionDialogState>({ kind: 'closed' });
  const [timerTick, setTimerTick] = useState(clockNow());
  const functionalStateRef = useRef<FunctionalState>(functionalState);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeRunIdRef = useRef<string | null>(null);
  const selectedAccountRef = useRef(selectedAccount);
  const mountedRef = useRef(true);
  const stopInFlightRef = useRef<Promise<void> | null>(null);
  const flowIdRef = useRef(0);
  const permissionRequestIdRef = useRef(0);
  const awaitingSettingsReturnRef = useRef(false);

  useEffect(() => {
    functionalStateRef.current = functionalState;
  }, [functionalState]);

  useEffect(() => {
    selectedAccountRef.current = selectedAccount;
  }, [selectedAccount]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activePointerIdRef.current = null;
      activeRunIdRef.current = null;
      originRef.current = null;
      stopInFlightRef.current = null;
      flowIdRef.current += 1;
      void captureVoiceInput.cancel();
      void transcribeVoiceInput.cancel();
      void interpretMovementEntryDraft.cancel();
    };
  }, [captureVoiceInput, interpretMovementEntryDraft, onError, transcribeVoiceInput]);

  useEffect(() => {
    if (enabled) {
      return;
    }
    permissionRequestIdRef.current += 1;
    awaitingSettingsReturnRef.current = false;
    activePointerIdRef.current = null;
    activeRunIdRef.current = null;
    originRef.current = null;
    flowIdRef.current += 1;
    setPermissionDialog({ kind: 'closed' });
    setFunctionalState({ kind: 'idle' });
  }, [enabled]);

  const finishVoiceCapture = useCallback(async (startedAt: number, flowId: number) => {
    const activeRunId = activeRunIdRef.current;
    let exportableRunId: string | null = activeRunId;

    setFunctionalState({ kind: 'stopping', startedAt });

    try {
      const capturedAudio = await captureVoiceInput.stop();
      if (!mountedRef.current || flowIdRef.current !== flowId) {
        activeRunIdRef.current = null;
        return;
      }

      activeRunIdRef.current = capturedAudio.runId;
      exportableRunId = capturedAudio.runId;
      setFunctionalState({ kind: 'transcribing', startedAt });

      const transcription = await transcribeVoiceInput.transcribe(capturedAudio);
      if (!mountedRef.current || flowIdRef.current !== flowId) {
        return;
      }
      if (transcription.failure) {
        throw transcription.failure;
      }

      const transcriptText = transcription.transcript?.text.trim() ?? '';
      if (!transcriptText) {
        throw { code: 'transcription-invalid-output', message: 'Local speech transcription returned invalid output.', recoverable: true };
      }

      if (!mountedRef.current || flowIdRef.current !== flowId) {
        return;
      }

      setFunctionalState({ kind: 'processing', startedAt });

      const inputLanguage = transcription.language?.trim() ?? '';
      const interpretation = await interpretMovementEntryDraft.interpret({
        runId: capturedAudio.runId,
        transcript: transcriptText,
        inputLanguage,
        currentDate: voiceInterpretationContext.currentDate,
        timeZone: voiceInterpretationContext.timeZone,
        locale: voiceInterpretationContext.locale,
        currency: selectedAccountRef.current?.currency ?? '',
        categories: voiceInterpretationContext.categoryOptions,
      });

      if (!mountedRef.current || flowIdRef.current !== flowId) {
        return;
      }
      if (interpretation.kind === 'failure') {
        throw {
          code: interpretation.failure.code,
          message: 'Movement interpretation failed.',
          recoverable: interpretation.failure.recoverable,
        } as const;
      }

      setFunctionalState({ kind: 'draft-ready', startedAt });
      await onMovementEntryDraftReady?.(interpretation.draft);
      if (!mountedRef.current || flowIdRef.current !== flowId) {
        return;
      }

      activeRunIdRef.current = null;
      setExportableRun({
        runId: capturedAudio.runId,
        outcome: 'success',
      });
      onCompleted?.({
        diagnosticsAvailable: Boolean(interpretationRunExporter),
      });
      if (mountedRef.current && flowIdRef.current === flowId) {
        setFunctionalState({ kind: 'idle' });
      }
    } catch (error) {
      if (!mountedRef.current || flowIdRef.current !== flowId) {
        return;
      }

      const failure = mapProcessingFailure(error);
      activeRunIdRef.current = null;
      if (exportableRunId) {
        setExportableRun({
          runId: exportableRunId,
          outcome: 'failure',
        });
      }
      setFunctionalState({ kind: 'failed', failure });
      onError?.({
        message: failure.message,
        diagnosticsAvailable: Boolean(exportableRunId && interpretationRunExporter),
      });
      setFunctionalState({ kind: 'idle' });
    }
  }, [
    captureVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    onError,
    onCompleted,
    onMovementEntryDraftReady,
    transcribeVoiceInput,
    voiceInterpretationContext,
  ]);

  const abortVoiceCapture = useCallback(async (
    nextState: FunctionalState = { kind: 'idle' },
    options: { discardRun?: boolean } = {},
  ) => {
    const runId = activeRunIdRef.current;
    flowIdRef.current += 1;
    try {
      const cancellationResults = await Promise.allSettled([
        captureVoiceInput.cancel(),
        transcribeVoiceInput.cancel(),
        interpretMovementEntryDraft.cancel(),
      ]);
      const cancellationSucceeded = cancellationResults.every((result) => result.status === 'fulfilled');
      if (options.discardRun && runId && cancellationSucceeded) {
        await captureVoiceInput.discardRun(runId);
        setExportableRun(null);
      } else if (!cancellationSucceeded) {
        onError?.({ message: UNSAFE_CANCELLATION_MESSAGE });
      }
    } catch {
      onError?.({ message: UNSAFE_CANCELLATION_MESSAGE });
    } finally {
      activeRunIdRef.current = null;
      if (mountedRef.current) {
        setFunctionalState(nextState);
      }
    }
  }, [captureVoiceInput, interpretMovementEntryDraft, onError, transcribeVoiceInput]);

  const resetPointerGesture = useCallback(() => {
    activePointerIdRef.current = null;
    originRef.current = null;
  }, []);

  const failWith = useCallback((error: unknown, fallbackMessage: string) => {
    const failure = error as CaptureFailure;
    const message = typeof failure?.message === 'string' && failure.message.trim()
      ? failure.message
      : fallbackMessage;
    const code = typeof failure?.code === 'string' ? failure.code : 'native-recorder-failure';
    const typedFailure = { code, message } as CaptureFailure;
    setFunctionalState({ kind: 'failed', failure: typedFailure });
    onError?.({ message, diagnosticsAvailable: false });
  }, [onError]);

  const startVoiceCapture = useCallback(async (nextState: 'recording' | 'locked') => {
    try {
      setExportableRun(null);
      const session = await captureVoiceInput.start();
      if (!mountedRef.current) {
        await captureVoiceInput.cancel();
        return;
      }
      activeRunIdRef.current = session.runId;
      setTimerTick(session.startedAt);
      setFunctionalState(nextState === 'locked'
        ? { kind: 'locked', startedAt: session.startedAt }
        : { kind: 'recording', startedAt: session.startedAt });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      resetPointerGesture();
      failWith(error, 'Voice capture could not start.');
    }
  }, [captureVoiceInput, failWith, resetPointerGesture]);

  const performExport = useCallback(async (runId: string): Promise<InterpretationRunExportOutcome | undefined> => {
    if (!interpretationRunExporter || isExportingDiagnostics) {
      return;
    }

    setIsExportingDiagnostics(true);
    try {
      const outcome = await interpretationRunExporter.exportRun(runId);
      if (outcome.kind === 'success') {
        setExportableRun((current) => (current?.runId === runId ? null : current));
      }
      if (outcome.kind === 'cancelled') {
        return outcome;
      }
      if (outcome.kind === 'failure') {
        onError?.({ message: outcome.failure.message, diagnosticsAvailable: true });
        return outcome;
      }
      return outcome;
    } finally {
      setIsExportingDiagnostics(false);
    }
  }, [interpretationRunExporter, isExportingDiagnostics, onError]);

  const exportVoiceRun = useCallback(async (): Promise<InterpretationRunExportOutcome | undefined> => {
    if (!exportableRun) {
      return;
    }
    return performExport(exportableRun.runId);
  }, [exportableRun, performExport]);

  const cancelVoicePipeline = useCallback(async (): Promise<void> => {
    const activeState = functionalStateRef.current;
    if (!isPostStopCancelableState(activeState)) {
      return;
    }

    const runId = activeRunIdRef.current ?? exportableRun?.runId;
    if (!runId) {
      return;
    }

    flowIdRef.current += 1;
    resetPointerGesture();
    stopInFlightRef.current = null;
    setFunctionalState({ kind: 'cancelling' });
    setExportableRun({ runId, outcome: 'failure' });

    try {
      const cancellationResults = await Promise.allSettled([
        captureVoiceInput.cancel(),
        transcribeVoiceInput.cancel(),
        interpretMovementEntryDraft.cancel(),
      ]);
      if (cancellationResults.some((result) => result.status === 'rejected')) {
        onError?.({ message: UNSAFE_CANCELLATION_MESSAGE });
      }
      await performExport(runId);
    } catch {
      onError?.({ message: UNSAFE_CANCELLATION_MESSAGE });
    } finally {
      activeRunIdRef.current = null;
      if (mountedRef.current) {
        setFunctionalState({ kind: 'idle' });
      }
    }
  }, [
    captureVoiceInput,
    exportableRun,
    interpretMovementEntryDraft,
    onError,
    performExport,
    resetPointerGesture,
    transcribeVoiceInput,
  ]);

  const stopActiveRecording = useCallback(async () => {
    if (stopInFlightRef.current) {
      await stopInFlightRef.current;
      return;
    }

    const activeState = functionalStateRef.current;
    if (!isRecordingState(activeState)) {
      return;
    }

    resetPointerGesture();
    const flowId = flowIdRef.current + 1;
    flowIdRef.current = flowId;
    const stopPromise = finishVoiceCapture(activeState.startedAt, flowId).finally(() => {
      stopInFlightRef.current = null;
    });
    stopInFlightRef.current = stopPromise;
    await stopPromise;
  }, [finishVoiceCapture, resetPointerGesture]);

  const handleLifecycleState = useCallback(async (state: AppLifecycleState) => {
    if (state === 'inactive') {
      permissionRequestIdRef.current += 1;
      const shouldCheckSettingsOnReturn = awaitingSettingsReturnRef.current;
      awaitingSettingsReturnRef.current = shouldCheckSettingsOnReturn;
      resetPointerGesture();
      setPermissionDialog({ kind: 'closed' });
      if (isOperationalState(functionalStateRef.current)) {
        await abortVoiceCapture();
      } else if (mountedRef.current) {
        setFunctionalState({ kind: 'idle' });
      }
      return;
    }

    if (!awaitingSettingsReturnRef.current) {
      return;
    }

    awaitingSettingsReturnRef.current = false;
    try {
      const status = await microphonePermission.getStatus();
      if (!mountedRef.current) {
        return;
      }
      if (status === 'granted') {
        setPermissionDialog({ kind: 'closed' });
        setFunctionalState({ kind: 'idle' });
        return;
      }
      setPermissionDialog(status === 'permanently-denied' ? { kind: 'open-settings' } : { kind: 'request-access' });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      failWith(error, 'Microphone permission state could not be refreshed.');
    }
  }, [abortVoiceCapture, failWith, microphonePermission, resetPointerGesture]);

  useEffect(() => {
    if (!['recording', 'locked', 'processing', 'stopping', 'transcribing'].includes(functionalState.kind)) {
      return;
    }
    const intervalId = timers.setInterval(() => {
      setTimerTick(clockNow());
    }, TIMER_REFRESH_MS);
    return () => {
      timers.clearInterval(intervalId);
    };
  }, [clockNow, functionalState, stopActiveRecording, timers]);

  useEffect(() => {
    if (!isRecordingState(functionalState)) {
      return;
    }
    const remainingMs = Math.max(0, functionalState.startedAt + MAX_RECORDING_DURATION_MS - clockNow());
    const timeoutId = timers.setTimeout(() => {
      void stopActiveRecording();
    }, remainingMs);
    return () => {
      timers.clearTimeout(timeoutId);
    };
  }, [clockNow, functionalState, stopActiveRecording, timers]);

  useEffect(() => {
    if (!appLifecycle) {
      return;
    }

    return appLifecycle.subscribe((state) => {
      void handleLifecycleState(state);
    });
  }, [appLifecycle, handleLifecycleState]);

  async function beginGesture(gesture: BeginGestureInput) {
    if (!enabled || !selectedAccountRef.current || isOperationalState(functionalStateRef.current)) {
      return;
    }

    resetPointerGesture();
    activePointerIdRef.current = gesture.pointerId;
    originRef.current = { x: gesture.clientX, y: gesture.clientY };
    setPermissionDialog({ kind: 'closed' });

    try {
      const status = await microphonePermission.getStatus();
      if (!mountedRef.current) {
        return;
      }
      if (status === 'granted') {
        await startVoiceCapture('recording');
        return;
      }
      resetPointerGesture();
      setFunctionalState({ kind: 'idle' });
      setPermissionDialog(status === 'permanently-denied' ? { kind: 'open-settings' } : { kind: 'request-access' });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      resetPointerGesture();
      failWith(error, 'Microphone permission could not be checked.');
    }
  }

  async function moveGesture(gesture: MoveGestureInput) {
    const currentState = functionalStateRef.current;
    if (gesture.pointerId !== activePointerIdRef.current || currentState.kind !== 'recording' || !originRef.current) {
      return;
    }

    const deltaX = gesture.clientX - originRef.current.x;
    const deltaY = gesture.clientY - originRef.current.y;

    if (deltaX <= -CANCEL_THRESHOLD_PX) {
      resetPointerGesture();
      setFunctionalState({ kind: 'cancelling' });
      await abortVoiceCapture({ kind: 'idle' }, { discardRun: true });
      return;
    }

    if (deltaY <= -LOCK_THRESHOLD_PX) {
      setFunctionalState({ kind: 'locked', startedAt: currentState.startedAt });
    }
  }

  async function finishGesture(gesture: FinishGestureInput) {
    if (gesture.pointerId !== activePointerIdRef.current) {
      return;
    }
    if (functionalStateRef.current.kind !== 'recording') {
      return;
    }
    await stopActiveRecording();
  }

  async function cancelGesture(gesture: FinishGestureInput) {
    if (gesture.pointerId !== activePointerIdRef.current) {
      return;
    }
    resetPointerGesture();
    setFunctionalState({ kind: 'cancelling' });
    await abortVoiceCapture({ kind: 'idle' }, { discardRun: true });
  }

  async function stopLockedRecording() {
    await stopActiveRecording();
  }

  function clearFailure() {
    if (functionalStateRef.current.kind === 'failed') {
      setFunctionalState({ kind: 'idle' });
    }
  }

  function dismissPermissionDialog() {
    awaitingSettingsReturnRef.current = false;
    resetPointerGesture();
    setPermissionDialog({ kind: 'closed' });
    setFunctionalState({ kind: 'idle' });
  }

  async function requestPermissionAndRecord() {
    if (permissionDialog.kind !== 'request-access') {
      return;
    }

    const requestId = permissionRequestIdRef.current + 1;
    permissionRequestIdRef.current = requestId;
    resetPointerGesture();
    setPermissionDialog({ kind: 'closed' });
    setFunctionalState({ kind: 'requesting-permission' });

    try {
      const status = await microphonePermission.request();
      if (!mountedRef.current || permissionRequestIdRef.current !== requestId) {
        return;
      }
      if (status === 'granted') {
        await startVoiceCapture('locked');
        return;
      }
      if (status === 'permanently-denied') {
        setFunctionalState({ kind: 'idle' });
        setPermissionDialog({ kind: 'open-settings' });
        return;
      }
      failWith(
        { code: 'permission-denied', message: 'Microphone access was denied.' },
        'Microphone access was denied.',
      );
    } catch (error) {
      if (!mountedRef.current || permissionRequestIdRef.current !== requestId) {
        return;
      }
      failWith(error, 'Microphone permission could not be requested.');
    }
  }

  async function openMicrophoneSettings() {
    if (permissionDialog.kind !== 'open-settings') {
      return;
    }

    awaitingSettingsReturnRef.current = true;
    try {
      await microphonePermission.openSettings();
    } catch (error) {
      awaitingSettingsReturnRef.current = false;
      failWith(error, 'Android settings could not be opened.');
    }
  }

  const presentationState = useMemo<MovementVoiceCapturePresentationState>(() => {
    const activeStartedAt = functionalState.kind === 'recording'
      || functionalState.kind === 'locked'
      || functionalState.kind === 'processing'
      || functionalState.kind === 'stopping'
      || functionalState.kind === 'transcribing'
      ? functionalState.startedAt
      : undefined;
    const elapsedLabel = activeStartedAt === undefined ? undefined : formatDuration(timerTick - activeStartedAt);

    switch (functionalState.kind) {
      case 'requesting-permission':
        return {
          kind: 'requesting-permission',
          headline: '',
          locked: false,
          busy: true,
        };
      case 'recording':
        return {
          kind: 'recording',
          elapsedLabel,
          headline: elapsedLabel ?? '00:00',
          locked: false,
          busy: false,
        };
      case 'locked':
        return {
          kind: 'locked',
          elapsedLabel,
          headline: elapsedLabel ?? '00:00',
          locked: true,
          busy: false,
        };
      case 'cancelling':
        return {
          kind: 'cancelling',
          headline: 'Discarding recording',
          supportingText: 'Cleaning up temporary audio.',
          locked: false,
          busy: true,
        };
      case 'stopping':
      case 'transcribing':
        return {
          kind: functionalState.kind,
          elapsedLabel,
          headline: functionalState.kind === 'stopping' ? 'Stopping recording…' : 'Transcribing…',
          supportingText: 'Audio stays on this device.',
          locked: false,
          busy: true,
        };
      case 'processing':
      case 'draft-ready':
        return {
          kind: functionalState.kind,
          elapsedLabel,
          headline: functionalState.kind === 'processing' ? '' : 'Draft ready',
          supportingText: functionalState.kind === 'processing' ? 'Audio stays on this device.' : 'Review the movement composer.',
          locked: false,
          busy: true,
        };
      case 'failed':
        return {
          kind: 'failed',
          headline: 'Retry voice capture',
          supportingText: 'Tap the microphone again after fixing access or recording issues.',
          errorMessage: functionalState.failure.message,
          locked: false,
          busy: false,
        };
      case 'idle':
      default:
        return {
          kind: 'idle',
          headline: 'Add movement',
          supportingText: 'Hold the microphone to record a voice draft.',
          locked: false,
          busy: false,
        };
    }
  }, [functionalState, timerTick]);

  const permissionDialogPresentation = useMemo<MovementVoicePermissionDialogPresentation>(() => {
    if (permissionDialog.kind === 'request-access') {
      return {
        open: true,
        kind: 'request-access',
        title: 'Use your microphone',
        description: 'Gonezo needs microphone access to record a voice draft. During this version, the audio stays on this device.',
        safeActionLabel: 'Allow and record',
        dismissActionLabel: 'Not now',
        busy: functionalState.kind === 'requesting-permission',
      };
    }

    if (permissionDialog.kind === 'open-settings') {
      return {
        open: true,
        kind: 'open-settings',
        title: 'Microphone access is off',
        description: 'Enable microphone access in Android settings to record a voice draft.',
        safeActionLabel: 'Open settings',
        dismissActionLabel: 'Cancel',
        busy: false,
      };
    }

    return { open: false };
  }, [functionalState.kind, permissionDialog.kind]);

  return {
    state: {
      functionalState: functionalState.kind,
      permissionDialog: permissionDialogPresentation,
      presentation: presentationState,
      addDisabled: isOperationalState(functionalState),
      navigationDimmed: functionalState.kind === 'recording'
        || functionalState.kind === 'locked'
        || functionalState.kind === 'requesting-permission'
        || functionalState.kind === 'stopping'
        || functionalState.kind === 'transcribing'
        || functionalState.kind === 'processing'
        || functionalState.kind === 'draft-ready'
        || functionalState.kind === 'cancelling',
    },
    commands: {
      beginGesture,
      moveGesture,
      finishGesture,
      cancelGesture,
      stopLockedRecording,
      cancelVoicePipeline,
      clearFailure,
      exportVoiceRun,
      dismissPermissionDialog,
      requestPermissionAndRecord,
      openMicrophoneSettings,
    },
  };
}
