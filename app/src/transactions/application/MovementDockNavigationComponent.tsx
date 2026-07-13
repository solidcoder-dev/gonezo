import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MovementQuickActionComponentProps } from './MovementQuickActionComponent.contract';
import type { MovementEntryDraft } from './MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import { useMovementVoiceCaptureModel } from './MovementVoiceEntry/useMovementVoiceCaptureModel';
import { useMovementQuickActionModel } from './useMovementQuickActionModel';
import { MovementDockNavigationView } from '../ui/MovementDockNavigation/MovementDockNavigationView';
import { MovementVoicePermissionDialog } from '../ui/MovementDockNavigation/MovementVoicePermissionDialog';
import { SheetView } from '../../shared/ui/SheetView';

const DOCK_ITEMS = [
  { id: 'home', label: 'Home', iconClassName: 'bi bi-house-door' },
  { id: 'analytics', label: 'Analytics', iconClassName: 'bi bi-bar-chart-line' },
  { id: 'movements', label: 'Movements', iconClassName: 'bi bi-receipt' },
  { id: 'profile', label: 'Profile', iconClassName: 'bi bi-person' },
];

const PAGE_PATH_BY_ID: Record<string, string> = {
  home: '/home',
  analytics: '/analytics',
  movements: '/movements',
  profile: '/profile',
};

const SELECTED_ACCOUNT_MISSING_MESSAGE = 'The selected account is no longer available. Select an account and try again.';

function createProcessingFailedError(message: string) {
  return {
    code: 'processing-failed' as const,
    message,
    recoverable: true as const,
  };
}

function activeItemIdFromPath(pathname: string): string {
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/movements') && !pathname.startsWith('/movements/search')) return 'movements';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export function MovementDockNavigationComponent({ required, provided = {} }: MovementQuickActionComponentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const microphoneButtonRef = useRef<HTMLButtonElement | null>(null);
  const [exportDiagnosticsOpen, setExportDiagnosticsOpen] = useState(false);
  const setMicrophoneButtonElement = useCallback((element: HTMLButtonElement | null) => {
    microphoneButtonRef.current = element;
  }, []);
  const ports = useMemo(() => ({
    ledger: required.context.core,
    preferences: required.context.core,
  }), [required.context.core]);
  const model = useMovementQuickActionModel({
    ports,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    draftRequest: required.config.draftRequest,
    events: provided.events,
  });
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
    enabled: required.config.enabled && required.context.voiceEntry.enabled && !model.required.status.disabled,
    selectedAccount: model.required.state.selectedAccountId && model.required.state.selectedAccountName
      ? {
          id: model.required.state.selectedAccountId,
          name: model.required.state.selectedAccountName,
          currency: model.required.state.accounts.find((account) => account.id === model.required.state.selectedAccountId)?.currency ?? '',
        }
      : undefined,
    clockNow: () => Date.now(),
    captureVoiceInput: required.context.voiceEntry.captureVoiceInput,
    transcribeVoiceInput: required.context.voiceEntry.transcribeVoiceInput,
    interpretMovementEntryDraft: required.context.voiceEntry.interpretMovementEntryDraft,
    interpretationRunExporter: required.context.voiceEntry.interpretationRunExporter,
    microphonePermission: required.context.voiceEntry.microphonePermission,
    voiceInterpretationContext: required.config.voiceInterpretationContext ?? {
      currentDate: new Date().toISOString().slice(0, 10),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: navigator.language || 'en-US',
      categoryOptions: [],
    },
    appLifecycle: required.context.voiceEntry.appLifecycle,
    onMovementEntryDraftReady: provided.events?.onMovementEntryDraftReady
      ? async (draft: MovementEntryDraft) => {
          const selectedAccountId = model.required.state.selectedAccountId;
          const selectedAccountName = model.required.state.selectedAccountName;
          const selectedAccountCurrency = model.required.state.accounts.find((account) => account.id === selectedAccountId)?.currency ?? '';
          if (!selectedAccountId || !selectedAccountName || !selectedAccountCurrency) {
            throw createProcessingFailedError(SELECTED_ACCOUNT_MISSING_MESSAGE);
          }
          await provided.events!.onMovementEntryDraftReady!({
            account: {
              id: selectedAccountId,
              name: selectedAccountName,
              currency: selectedAccountCurrency,
            },
            draft,
          });
        }
      : undefined,
    onCompleted: handleVoiceCompleted,
    onError: handleVoiceError,
  });

  function selectItem(itemId: string) {
    const path = PAGE_PATH_BY_ID[itemId];
    if (path) {
      navigate(path);
    }
  }

  function bindPointerGesture<T extends HTMLButtonElement>(
    callback: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void,
  ) {
    return async (event: ReactPointerEvent<T>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }
      if ('setPointerCapture' in event.currentTarget && event.type === 'pointerdown') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      await callback({
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };
  }

  function bindPointerFinish<T extends HTMLButtonElement>(
    callback: (gesture: { pointerId: number }) => Promise<void> | void,
  ) {
    return async (event: ReactPointerEvent<T>) => {
      if ('releasePointerCapture' in event.currentTarget) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // noop
        }
      }
      event.preventDefault();
      await callback({ pointerId: event.pointerId });
    };
  }

  return (
    <>
      <MovementDockNavigationView
        required={{
          config: {
            ariaLabel: 'Primary navigation',
            addAriaLabel: 'Add movement',
            microphoneAriaLabel: 'Record movement with voice',
            stopLockedAriaLabel: 'Stop locked voice recording',
            cancelVoiceAriaLabel: 'Cancel voice processing',
          },
          data: {
            items: DOCK_ITEMS,
          },
          state: {
            activeItemId: activeItemIdFromPath(location.pathname),
            voiceCapture: voiceModel.state.presentation,
          },
          status: {
            disabled: voiceModel.state.navigationDimmed,
            addDisabled: voiceModel.state.addDisabled,
            navigationDimmed: voiceModel.state.navigationDimmed,
          },
        }}
        provided={{
          commands: {
            selectItem,
            pressAdd: model.provided.commands.openDraft,
            retryVoiceCapture: voiceModel.commands.clearFailure,
            stopLockedRecording: voiceModel.commands.stopLockedRecording,
            cancelVoicePipeline: voiceModel.commands.cancelVoicePipeline,
            setMicrophoneButtonElement,
            onVoicePointerDown: bindPointerGesture(voiceModel.commands.beginGesture),
            onVoicePointerMove: bindPointerGesture(voiceModel.commands.moveGesture),
            onVoicePointerUp: bindPointerFinish(voiceModel.commands.finishGesture),
            onVoicePointerCancel: bindPointerFinish(voiceModel.commands.cancelGesture),
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
