import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMovementQuickActionModel } from './useMovementQuickActionModel';
import type { MovementQuickActionComponentProvided } from './MovementQuickActionComponent.contract';
import { ExperimentalMovementDockNavigationView } from '../ui/ExperimentalMovementDockNavigation/ExperimentalMovementDockNavigationView';
import { MovementVoicePermissionDialog } from '../ui/MovementVoiceEntry/MovementVoicePermissionDialog';
import { useMovementVoiceEntryController } from './MovementVoiceEntry/useMovementVoiceEntryController';
import type { ExperimentalMovementDockNavigationComponentProps } from './ExperimentalMovementDockNavigationComponent.contract';

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

function activeItemIdFromPath(pathname: string): string {
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/movements') && !pathname.startsWith('/movements/search')) return 'movements';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export function ExperimentalMovementDockNavigationComponent({ required, provided = {} }: ExperimentalMovementDockNavigationComponentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const microphoneButtonRef = useRef<HTMLButtonElement | null>(null);
  const providedEvents = provided.events;
  const quickActionEvents = useMemo<MovementQuickActionComponentProvided['events']>(() => ({
    onCreateMovementRequested: providedEvents?.onCreateMovementRequested
      ? (movement) => {
          providedEvents.onCreateMovementRequested?.(movement);
        }
      : undefined,
    onError: providedEvents?.onError
      ? (error) => {
          providedEvents.onError?.({
            ...error,
            tone: error.tone ?? 'error',
          });
        }
      : undefined,
  }), [providedEvents]);
  const quickActionModel = useMovementQuickActionModel({
    ports: {
      ledger: required.context.core,
      preferences: required.context.core,
    },
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    draftRequest: required.config.draftRequest,
    events: quickActionEvents,
  });

  const selectedAccount = useMemo(() => {
    const selectedAccountId = quickActionModel.required.state.selectedAccountId;
    const selectedAccountName = quickActionModel.required.state.selectedAccountName;
    if (!selectedAccountId || !selectedAccountName) {
      return null;
    }
    const account = quickActionModel.required.state.accounts.find((item) => item.id === selectedAccountId);
    if (!account) {
      return null;
    }
    return {
      id: selectedAccountId,
      name: selectedAccountName,
      currency: account.currency,
    };
  }, [
    quickActionModel.required.state.accounts,
    quickActionModel.required.state.selectedAccountId,
    quickActionModel.required.state.selectedAccountName,
  ]);

  const voiceController = useMovementVoiceEntryController({
    enabled: required.config.enabled && required.context.voiceEntry.enabled,
    voiceEntry: required.context.voiceEntry,
    selectedAccount,
    voiceInterpretationContext: required.config.voiceInterpretationContext,
    events: {
      onMovementEntryDraftReady: provided.events?.onMovementEntryDraftReady,
      onNotice: provided.events?.onNotice,
      onError: provided.events?.onError,
    },
  });

  useEffect(() => {
    provided.events?.onBusyChanged?.(voiceController.state.busy);
  }, [provided.events, voiceController.state.busy]);

  useEffect(() => () => {
    provided.events?.onBusyChanged?.(false);
  }, [provided.events]);

  function selectItem(itemId: string) {
    const path = PAGE_PATH_BY_ID[itemId];
    if (path) {
      navigate(path);
    }
  }

  return (
    <>
      <ExperimentalMovementDockNavigationView
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
            voiceCapture: voiceController.state.presentation,
          },
          status: {
            disabled: voiceController.state.navigationDimmed,
            addDisabled: voiceController.state.manualAddDisabled || quickActionModel.required.status.disabled,
            navigationDimmed: voiceController.state.navigationDimmed,
          },
        }}
        provided={{
          commands: {
            selectItem,
            pressAdd: quickActionModel.provided.commands.openDraft,
            retryVoiceCapture: voiceController.commands.retry,
            stopLockedRecording: voiceController.commands.stopLockedRecording,
            cancelVoicePipeline: voiceController.commands.cancelVoicePipeline,
            setMicrophoneButtonElement: (element) => {
              microphoneButtonRef.current = element;
            },
            onVoicePointerDown: voiceController.commands.beginGesture,
            onVoicePointerMove: voiceController.commands.moveGesture,
            onVoicePointerUp: voiceController.commands.finishGesture,
            onVoicePointerCancel: voiceController.commands.cancelGesture,
          },
        }}
      />
      {voiceController.state.permissionDialog.open ? (
        <MovementVoicePermissionDialog
          open
          title={voiceController.state.permissionDialog.title}
          description={voiceController.state.permissionDialog.description}
          dismissActionLabel={voiceController.state.permissionDialog.dismissActionLabel}
          safeActionLabel={voiceController.state.permissionDialog.safeActionLabel}
          busy={voiceController.state.permissionDialog.busy}
          restoreFocusTo={microphoneButtonRef}
          onDismiss={voiceController.commands.dismissPermissionDialog}
          onSafeAction={
            voiceController.state.permissionDialog.kind === 'open-settings'
              ? voiceController.commands.openSystemSettings
              : voiceController.commands.requestPermissionAndRecord
          }
        />
      ) : null}
    </>
  );
}
