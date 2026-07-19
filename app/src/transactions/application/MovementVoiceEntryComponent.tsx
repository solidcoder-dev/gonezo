import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { MovementVoicePermissionDialog } from '../ui/MovementVoiceEntry/MovementVoicePermissionDialog';
import { SheetView } from '../../shared/ui/SheetView';
import { MovementVoiceEntryView } from '../ui/MovementVoiceEntry/MovementVoiceEntryView';
import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import { useMovementVoiceCaptureModel } from './MovementVoiceEntry/useMovementVoiceCaptureModel';
import type {
  MovementVoiceEntryCategoryItem,
  MovementVoiceEntryComponentProps,
} from './MovementVoiceEntryComponent.contract';

export type {
  MovementVoiceEntryComponentProps,
  MovementVoiceEntrySelectedAccount,
  MovementVoiceEntryComponentProvided,
  MovementVoiceEntryComponentRequired,
  MovementVoiceEntryCategorySourcePort,
  MovementVoiceEntryCategoryItem,
  MovementVoiceEntryCategorySourceResult,
  MovementVoiceEntryErrorNotice,
  MovementVoiceEntryNotice,
} from './MovementVoiceEntryComponent.contract';

const SELECTED_ACCOUNT_MISSING_MESSAGE = 'The selected account is no longer available. Select an account and try again.';
const CATEGORY_LOAD_FAILURE_MESSAGE = 'Unable to load categories for voice capture.';

type CategoryLoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

type CategoryLoadState = Readonly<{
  status: CategoryLoadStatus;
  options: ReadonlyArray<{ id: string; label: string }>;
}>;

type CategoryLoadAction =
  | Readonly<{ type: 'reset' }>
  | Readonly<{ type: 'loading' }>
  | Readonly<{ type: 'loaded'; options: ReadonlyArray<{ id: string; label: string }> }>
  | Readonly<{ type: 'failed' }>;

function createProcessingFailedError(message: string) {
  return {
    code: 'processing-failed' as const,
    message,
    recoverable: true as const,
  };
}

function mapCategoryOptions(items: ReadonlyArray<MovementVoiceEntryCategoryItem>) {
  return items
    .filter((item) => item.status === 'active')
    .map((item) => ({
      id: item.id,
      label: item.name,
    }));
}

function resolveVoiceInterpretationContext(
  overrides: MovementVoiceEntryComponentProps['required']['config']['voiceInterpretationContext'] | undefined,
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

export function MovementVoiceEntryComponent({ required, provided = {} }: MovementVoiceEntryComponentProps) {
  const microphoneButtonRef = useRef<HTMLButtonElement | null>(null);
  const categoryLoadRequestIdRef = useRef(0);
  const categoryLoadErrorRef = useRef(provided.events?.onError);
  const [exportDiagnosticsOpen, setExportDiagnosticsOpen] = useState(false);
  useEffect(() => {
    categoryLoadErrorRef.current = provided.events?.onError;
  }, [provided.events?.onError]);

  const [categoryLoadState, dispatchCategoryLoadState] = useReducer(
    (state: CategoryLoadState, action: CategoryLoadAction): CategoryLoadState => {
      switch (action.type) {
        case 'reset':
          return { status: 'idle', options: [] };
        case 'loading':
          return { status: 'loading', options: [] };
        case 'loaded':
          return { status: 'ready', options: action.options };
        case 'failed':
          return { status: 'failed', options: [] };
        default:
          return state;
      }
    },
    {
      status: required.config.enabled && required.context.voiceEntry.enabled ? 'loading' : 'idle',
      options: [],
    },
  );
  const setMicrophoneButtonElement = useCallback((element: HTMLButtonElement | null) => {
    microphoneButtonRef.current = element;
  }, []);

  const selectedAccount = required.config.selectedAccount ?? undefined;
  const voiceEntryEnabled = required.config.enabled && required.context.voiceEntry.enabled;
  const effectiveCategoryLoadStatus = voiceEntryEnabled ? categoryLoadState.status : 'idle';
  const resolvedCategoryOptions = useMemo(
    () => (voiceEntryEnabled ? categoryLoadState.options : []),
    [categoryLoadState.options, voiceEntryEnabled],
  );
  const enabled = voiceEntryEnabled && effectiveCategoryLoadStatus !== 'loading';
  useEffect(() => {
    if (!voiceEntryEnabled) {
      categoryLoadRequestIdRef.current += 1;
      dispatchCategoryLoadState({ type: 'reset' });
      return;
    }

    let cancelled = false;
    const requestId = ++categoryLoadRequestIdRef.current;
    dispatchCategoryLoadState({ type: 'loading' });

    void (async () => {
      try {
        const result = await required.context.voiceEntry.categorySource.taxonomyListCategories({ includeArchived: false });
        if (cancelled || categoryLoadRequestIdRef.current !== requestId) {
          return;
        }
        dispatchCategoryLoadState({ type: 'loaded', options: mapCategoryOptions(result.items) });
      } catch {
        if (cancelled || categoryLoadRequestIdRef.current !== requestId) {
          return;
        }
        dispatchCategoryLoadState({ type: 'failed' });
        categoryLoadErrorRef.current?.({
          message: CATEGORY_LOAD_FAILURE_MESSAGE,
          tone: 'warning',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [required.context.voiceEntry.categorySource, required.context.voiceEntry.enabled, voiceEntryEnabled]);

  const voiceInterpretationContextOverrides = required.config.voiceInterpretationContext;
  const voiceInterpretationContext = useMemo(
    () => resolveVoiceInterpretationContext(voiceInterpretationContextOverrides, resolvedCategoryOptions),
    [resolvedCategoryOptions, voiceInterpretationContextOverrides],
  );

  const handleVoiceError = useCallback((error: {
    message: string;
    diagnosticsAvailable?: boolean;
  }) => {
    provided.events?.onError?.({
      message: error.message,
      tone: 'warning',
      action: error.diagnosticsAvailable
        ? {
            label: 'Download ZIP',
            run: () => setExportDiagnosticsOpen(true),
          }
        : undefined,
    });
  }, [provided.events]);

  const handleVoiceCompleted = useCallback((result: {
    diagnosticsAvailable: boolean;
  }) => {
    provided.events?.onNotice?.({
      message: 'Voice draft created. Review the interpreted values.',
      tone: 'info',
      action: result.diagnosticsAvailable
        ? {
            label: 'Download ZIP',
            run: () => setExportDiagnosticsOpen(true),
          }
        : undefined,
    });
  }, [provided.events]);

  const voiceModel = useMovementVoiceCaptureModel({
    enabled,
    selectedAccount,
    clockNow: () => Date.now(),
    captureVoiceInput: required.context.voiceEntry.captureVoiceInput,
    transcribeVoiceInput: required.context.voiceEntry.transcribeVoiceInput,
    interpretMovementEntryDraft: required.context.voiceEntry.interpretMovementEntryDraft,
    interpretationRunExporter: required.context.voiceEntry.interpretationRunExporter,
    microphonePermission: required.context.voiceEntry.microphonePermission,
    voiceInterpretationContext,
    appLifecycle: required.context.voiceEntry.appLifecycle,
    onMovementEntryDraftReady: provided.events?.onMovementEntryDraftReady
      ? async (draft: MovementEntryDraft) => {
          if (!selectedAccount || !selectedAccount.id || !selectedAccount.name || !selectedAccount.currency) {
            throw createProcessingFailedError(SELECTED_ACCOUNT_MISSING_MESSAGE);
          }

          await provided.events!.onMovementEntryDraftReady!({
            account: selectedAccount,
            draft,
          });
        }
      : undefined,
    onCompleted: handleVoiceCompleted,
    onError: handleVoiceError,
  });

  return (
    <>
      <MovementVoiceEntryView
        required={{
          config: {
            microphoneAriaLabel: 'Record movement with voice',
            stopLockedAriaLabel: 'Stop locked voice recording',
            cancelVoiceAriaLabel: 'Cancel voice processing',
          },
          data: {},
          state: {
            voiceCapture: voiceModel.state.presentation,
          },
          status: {},
        }}
        provided={{
          commands: {
            retryVoiceCapture: voiceModel.commands.clearFailure,
            stopLockedRecording: voiceModel.commands.stopLockedRecording,
            cancelVoicePipeline: voiceModel.commands.cancelVoicePipeline,
            setMicrophoneButtonElement,
            onVoicePointerDown: voiceModel.commands.beginGesture,
            onVoicePointerMove: voiceModel.commands.moveGesture,
            onVoicePointerUp: voiceModel.commands.finishGesture,
            onVoicePointerCancel: voiceModel.commands.cancelGesture,
          },
        }}
      />
      {voiceModel.state.permissionDialog.open ? (
        <MovementVoicePermissionDialog
          open
          title={voiceModel.state.permissionDialog.title}
          description={voiceModel.state.permissionDialog.description}
          dismissActionLabel={voiceModel.state.permissionDialog.dismissActionLabel}
          safeActionLabel={voiceModel.state.permissionDialog.safeActionLabel}
          busy={voiceModel.state.permissionDialog.busy}
          restoreFocusTo={microphoneButtonRef}
          onDismiss={voiceModel.commands.dismissPermissionDialog}
          onSafeAction={
            voiceModel.state.permissionDialog.kind === 'open-settings'
              ? voiceModel.commands.openMicrophoneSettings
              : voiceModel.commands.requestPermissionAndRecord
          }
        />
      ) : null}
      <SheetView
        required={{
          config: {
            ariaLabel: 'Export voice run',
            title: 'Export voice run',
            closeLabel: 'Close voice run export',
            closeOnBackdrop: true,
          },
          data: {
            body: (
              <p>This ZIP contains the audio recording, transcript and interpretation. Store it somewhere secure.</p>
            ),
            footer: (
              <div className="quick-row">
                <button type="button" className="text-button" onClick={() => setExportDiagnosticsOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-cta"
                  onClick={async () => {
                    setExportDiagnosticsOpen(false);
                    const outcome = await voiceModel.commands.exportVoiceRun();
                    if (!outcome) {
                      return;
                    }
                    if (outcome.kind === 'success') {
                      provided.events?.onNotice?.({
                        message: 'Diagnostic ZIP exported.',
                        tone: 'success',
                      });
                      return;
                    }
                    if (outcome.kind === 'failure') {
                      provided.events?.onError?.({
                        message: outcome.failure.message,
                        tone: 'error',
                      });
                    }
                  }}
                >
                  Export ZIP
                </button>
              </div>
            ),
          },
          state: {
            open: exportDiagnosticsOpen,
          },
          status: {},
        }}
        provided={{
          commands: {
            close: () => setExportDiagnosticsOpen(false),
          },
        }}
      />
    </>
  );
}
