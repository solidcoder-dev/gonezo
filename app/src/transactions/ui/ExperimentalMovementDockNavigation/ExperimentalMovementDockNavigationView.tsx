import type { ExperimentalMovementDockNavigationViewProps } from './ExperimentalMovementDockNavigationView.contract';
import './ExperimentalMovementDockNavigationView.css';

export type { ExperimentalMovementDockNavigationViewProps } from './ExperimentalMovementDockNavigationView.contract';

const LEFT_ITEM_COUNT = 2;

function isRecordingState(kind: ExperimentalMovementDockNavigationViewProps['required']['state']['voiceCapture']['kind']): boolean {
  return kind === 'recording'
    || kind === 'locked'
    || kind === 'requesting-permission'
    || kind === 'cancelling'
    || kind === 'stopping'
    || kind === 'transcribing'
    || kind === 'processing';
}

export function ExperimentalMovementDockNavigationView({ required, provided }: ExperimentalMovementDockNavigationViewProps) {
  const voiceCaptureState = required.state.voiceCapture;
  const draftReadyState = voiceCaptureState.kind === 'draft-ready';
  const compactPipelineState = voiceCaptureState.kind === 'cancelling'
    || voiceCaptureState.kind === 'stopping'
    || voiceCaptureState.kind === 'transcribing'
    || voiceCaptureState.kind === 'processing';
  const showVoiceCaptureStatus = voiceCaptureState.kind !== 'idle';
  const {
    cancelVoicePipeline,
    pressAdd,
    retryVoiceCapture,
    selectItem,
    setMicrophoneButtonElement,
    toggleCapture,
  } = provided.commands;
  const voiceCaptureKind = voiceCaptureState.kind;
  const voiceCaptureBusy = voiceCaptureState.busy;
  const recordingState = isRecordingState(voiceCaptureState.kind) || draftReadyState;
  const navClassName = [
    'movement-dock-navigation',
    required.status.navigationDimmed ? 'movement-dock-navigation--dimmed' : '',
  ].filter(Boolean).join(' ');
  const capsuleClassName = [
    'movement-dock-capsule',
    recordingState ? 'movement-dock-capsule--recording' : '',
    voiceCaptureState.kind === 'failed' ? 'movement-dock-capsule--failed' : '',
  ].filter(Boolean).join(' ');

  function handleMicrophoneTap() {
    if (voiceCaptureKind === 'failed') {
      retryVoiceCapture();
      return;
    }
    if (compactPipelineState) {
      cancelVoicePipeline?.();
      return;
    }
    if (voiceCaptureBusy && voiceCaptureKind !== 'recording' && voiceCaptureKind !== 'locked') {
      return;
    }
    void toggleCapture();
  }

  return (
    <nav className={navClassName} aria-label={required.config.ariaLabel}>
      <div className="movement-dock-bar">
        <div className="movement-dock-side movement-dock-side--left">
          {required.data.items.slice(0, LEFT_ITEM_COUNT).map((item) => {
            const active = item.id === required.state.activeItemId;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'movement-dock-item movement-dock-item--active' : 'movement-dock-item'}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                disabled={required.status.disabled}
                onClick={() => { void selectItem(item.id); }}
              >
                <i className={item.iconClassName} aria-hidden />
                <span className="movement-dock-item-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="movement-dock-bar-gap" aria-hidden />

        <div className="movement-dock-side movement-dock-side--right">
          {required.data.items.slice(LEFT_ITEM_COUNT).map((item) => {
            const active = item.id === required.state.activeItemId;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'movement-dock-item movement-dock-item--active' : 'movement-dock-item'}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                disabled={required.status.disabled}
                onClick={() => { void selectItem(item.id); }}
              >
                <i className={item.iconClassName} aria-hidden />
                <span className="movement-dock-item-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={capsuleClassName} data-state={voiceCaptureState.kind}>
        {showVoiceCaptureStatus ? (
          <div className="movement-dock-recording-status">
            <span className="movement-dock-recording-headline" aria-live="polite">
              {compactPipelineState ? <i className="bi bi-arrow-repeat movement-dock-spinner" aria-hidden /> : null}
              {!compactPipelineState && (voiceCaptureState.kind === 'recording' || voiceCaptureState.kind === 'locked') ? (
                <span className="movement-dock-red-dot" aria-hidden />
              ) : null}
              {!compactPipelineState && voiceCaptureState.headline ? <span>{voiceCaptureState.headline}</span> : null}
            </span>
            {!compactPipelineState && voiceCaptureState.kind !== 'failed' && voiceCaptureState.supportingText ? (
              <span className="movement-dock-recording-hint">{voiceCaptureState.supportingText}</span>
            ) : null}
          </div>
        ) : (
          <div className="movement-dock-idle-actions">
            <button
              type="button"
              className="movement-dock-add"
              aria-label={required.config.addAriaLabel}
              disabled={required.status.addDisabled}
              onClick={() => { void pressAdd(); }}
            >
              <i className="bi bi-plus-lg" aria-hidden />
            </button>
            <span className="movement-dock-divider" aria-hidden />
          </div>
        )}

        <button
          ref={setMicrophoneButtonElement}
          type="button"
          className={recordingState ? 'movement-dock-microphone movement-dock-microphone--recording' : 'movement-dock-microphone'}
          aria-label={compactPipelineState
            ? (required.config.cancelVoiceAriaLabel ?? required.config.stopLockedAriaLabel)
            : recordingState && !draftReadyState
              ? required.config.stopLockedAriaLabel
              : required.config.microphoneAriaLabel}
          disabled={required.status.microphoneDisabled}
          aria-invalid={voiceCaptureKind === 'failed' ? 'true' : undefined}
          aria-pressed={voiceCaptureKind === 'recording' || voiceCaptureKind === 'locked'}
          onClick={() => { void handleMicrophoneTap(); }}
        >
          <i
            className={`bi ${
              compactPipelineState
                ? 'bi-x-circle'
                : recordingState
                  && !draftReadyState
                  ? 'bi-stop-circle'
                  : voiceCaptureKind === 'failed'
                    ? 'bi-mic-fill'
                    : 'bi-mic'
            }`}
            aria-hidden
          />
        </button>
      </div>
    </nav>
  );
}
