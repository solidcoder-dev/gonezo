import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MovementEntryDraft } from './MovementEntryDraftInterpreterPort';
import type { MovementVoiceEntryContext } from './movementVoiceEntryContext';
import {
  useMovementVoiceCaptureModel,
  type MovementVoiceCapturePresentationState,
  type MovementVoicePermissionDialogPresentation,
} from './useMovementVoiceCaptureModel';
import type { MovementVoiceEntryErrorNotice, MovementVoiceEntryNotice, MovementVoiceEntrySelectedAccount } from '../MovementVoiceEntryComponent.contract';

export type PointerInput = Readonly<{
  pointerId: number;
  clientX: number;
  clientY: number;
}>;

export type PointerFinishInput = Readonly<{
  pointerId: number;
}>;

export type MovementVoiceEntryControllerDiagnosticsState = Readonly<{
  available: boolean;
}>;

export type MovementVoiceEntryControllerState = Readonly<{
  presentation: MovementVoiceCapturePresentationState;
  navigationDimmed: boolean;
  manualAddDisabled: boolean;
  busy: boolean;
  permissionDialog: MovementVoicePermissionDialogPresentation;
  diagnostics: MovementVoiceEntryControllerDiagnosticsState | null;
}>;

export type MovementVoiceEntryControllerCommands = Readonly<{
  beginGesture(input: PointerInput): void;
  moveGesture(input: PointerInput): void;
  finishGesture(input: PointerFinishInput): void;
  cancelGesture(input: PointerFinishInput): void;
  stopLockedRecording(): void;
  cancelVoicePipeline(): void;
  retry(): void;
  dismissPermissionDialog(): void;
  requestPermissionAndRecord(): void;
  openSystemSettings(): void;
  downloadDiagnostics(): Promise<void>;
}>;

export type MovementVoiceEntryControllerEvents = Readonly<{
  onMovementEntryDraftReady?: (
    movement: Readonly<{
      account: MovementVoiceEntrySelectedAccount;
      draft: MovementEntryDraft;
    }>,
  ) => Promise<void> | void;
  onNotice?: (notice: MovementVoiceEntryNotice) => void;
  onError?: (error: MovementVoiceEntryErrorNotice) => void;
}>;

export type UseMovementVoiceEntryControllerInput = Readonly<{
  enabled: boolean;
  voiceEntry: MovementVoiceEntryContext;
  selectedAccount: MovementVoiceEntrySelectedAccount | null;
  voiceInterpretationContext?: Readonly<{
    currentDate?: string;
    timeZone?: string;
    locale?: string;
  }>;
  events?: MovementVoiceEntryControllerEvents;
}>;

export type MovementVoiceEntryController = Readonly<{
  state: MovementVoiceEntryControllerState;
  commands: MovementVoiceEntryControllerCommands;
}>;

const SELECTED_ACCOUNT_MISSING_MESSAGE = 'The selected account is no longer available. Select an account and try again.';

function createProcessingFailedError(message: string) {
  return {
    code: 'processing-failed' as const,
    message,
    recoverable: true as const,
  };
}

function resolveVoiceInterpretationContext(
  overrides: UseMovementVoiceEntryControllerInput['voiceInterpretationContext'] | undefined,
  categoryOptions: ReadonlyArray<{ id: string; label: string }>,
) {
  const currentDate = overrides?.currentDate ?? new Date().toISOString().slice(0, 10);
  const timeZone = overrides?.timeZone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const locale = overrides?.locale ?? (navigator.language || 'en-US');

  return {
    currentDate,
    timeZone,
    locale,
    categoryOptions,
  };
}

export function useMovementVoiceEntryController({
  enabled,
  voiceEntry,
  selectedAccount,
  voiceInterpretationContext,
  events,
}: UseMovementVoiceEntryControllerInput): MovementVoiceEntryController {
  const [diagnostics, setDiagnostics] = useState<MovementVoiceEntryControllerDiagnosticsState | null>(null);
  const downloadDiagnosticsRef = useRef<(() => Promise<void>) | null>(null);
  const {
    captureVoiceInput,
    transcribeVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    microphonePermission,
    appLifecycle,
    categorySource,
  } = voiceEntry;

  const [categoryOptions, setCategoryOptions] = useState<ReadonlyArray<{ id: string; label: string }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setCategoryOptions([]);
      setCategoryLoading(false);
      return;
    }

    setCategoryLoading(true);
    void (async () => {
      try {
        const result = await categorySource.taxonomyListCategories({ includeArchived: false });
        if (!cancelled) {
          setCategoryOptions(
            result.items
              .filter((item) => item.status === 'active')
              .map((item) => ({ id: item.id, label: item.name })),
          );
        }
      } catch {
        if (!cancelled) {
          events?.onError?.({
            message: 'Unable to load categories for voice capture.',
            tone: 'warning',
          });
          setCategoryOptions([]);
        }
      } finally {
        if (!cancelled) {
          setCategoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categorySource, enabled, events]);

  const resolvedVoiceInterpretationContext = useMemo(
    () => resolveVoiceInterpretationContext(voiceInterpretationContext, categoryOptions),
    [categoryOptions, voiceInterpretationContext],
  );

  const voiceModel = useMovementVoiceCaptureModel({
    enabled: enabled && Boolean(selectedAccount) && !categoryLoading,
    selectedAccount: selectedAccount ?? undefined,
    clockNow: () => Date.now(),
    captureVoiceInput,
    transcribeVoiceInput,
    interpretMovementEntryDraft,
    interpretationRunExporter,
    microphonePermission,
    voiceInterpretationContext: resolvedVoiceInterpretationContext,
    appLifecycle,
    onMovementEntryDraftReady: events?.onMovementEntryDraftReady
      ? async (draft: MovementEntryDraft) => {
          if (!selectedAccount) {
            throw createProcessingFailedError(SELECTED_ACCOUNT_MISSING_MESSAGE);
          }

          await events.onMovementEntryDraftReady?.({
            account: selectedAccount,
            draft,
          });
        }
      : undefined,
    onCompleted: (result) => {
      if (result.diagnosticsAvailable) {
        setDiagnostics({ available: true });
      }
      events?.onNotice?.({
        message: 'Voice draft created. Review the interpreted values.',
        tone: 'info',
        action: result.diagnosticsAvailable
          ? {
              label: 'Download ZIP',
              run: () => {
                void downloadDiagnosticsRef.current?.();
              },
            }
          : undefined,
      });
    },
    onError: (error) => {
      if (error.diagnosticsAvailable) {
        setDiagnostics({ available: true });
      }
      events?.onError?.({
        message: error.message,
        tone: 'warning',
        action: error.diagnosticsAvailable
          ? {
              label: 'Download ZIP',
              run: () => {
                void downloadDiagnosticsRef.current?.();
              },
            }
          : undefined,
      });
    },
  });

  const beginGesture = useCallback((input: PointerInput) => {
    void voiceModel.commands.beginGesture(input);
    setDiagnostics(null);
  }, [voiceModel.commands]);

  const moveGesture = useCallback((input: PointerInput) => {
    void voiceModel.commands.moveGesture(input);
  }, [voiceModel.commands]);

  const finishGesture = useCallback((input: PointerFinishInput) => {
    void voiceModel.commands.finishGesture(input);
  }, [voiceModel.commands]);

  const cancelGesture = useCallback((input: PointerFinishInput) => {
    void voiceModel.commands.cancelGesture(input);
  }, [voiceModel.commands]);

  const stopLockedRecording = useCallback(() => {
    void voiceModel.commands.stopLockedRecording();
  }, [voiceModel.commands]);

  const cancelVoicePipeline = useCallback(() => {
    void voiceModel.commands.cancelVoicePipeline();
  }, [voiceModel.commands]);

  const retry = useCallback(() => {
    voiceModel.commands.clearFailure();
  }, [voiceModel.commands]);

  const dismissPermissionDialog = useCallback(() => {
    voiceModel.commands.dismissPermissionDialog();
  }, [voiceModel.commands]);

  const requestPermissionAndRecord = useCallback(() => {
    void voiceModel.commands.requestPermissionAndRecord();
  }, [voiceModel.commands]);

  const openSystemSettings = useCallback(() => {
    void voiceModel.commands.openMicrophoneSettings();
  }, [voiceModel.commands]);

  const downloadDiagnostics = useCallback(async () => {
    const outcome = await voiceModel.commands.exportVoiceRun();
    if (!outcome) {
      return;
    }
    if (outcome.kind === 'success') {
      setDiagnostics(null);
      events?.onNotice?.({
        message: 'Diagnostic ZIP exported.',
        tone: 'success',
      });
      return;
    }
    if (outcome.kind === 'failure') {
      events?.onError?.({
        message: outcome.failure.message,
        tone: 'error',
      });
    }
  }, [events, voiceModel.commands]);

  useEffect(() => {
    downloadDiagnosticsRef.current = downloadDiagnostics;
  }, [downloadDiagnostics]);

  return {
    state: {
      presentation: voiceModel.state.presentation,
      navigationDimmed: voiceModel.state.navigationDimmed,
      manualAddDisabled: voiceModel.state.addDisabled,
      busy: voiceModel.state.navigationDimmed,
      permissionDialog: voiceModel.state.permissionDialog,
      diagnostics,
    },
    commands: {
      beginGesture,
      moveGesture,
      finishGesture,
      cancelGesture,
      stopLockedRecording,
      cancelVoicePipeline,
      retry,
      dismissPermissionDialog,
      requestPermissionAndRecord,
      openSystemSettings,
      downloadDiagnostics,
    },
  };
}
