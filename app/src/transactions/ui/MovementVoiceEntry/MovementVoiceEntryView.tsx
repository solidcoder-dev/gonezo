import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { MovementVoiceEntryViewProps } from './MovementVoiceEntryView.contract';
import './MovementVoiceEntryView.css';

export type { MovementVoiceEntryViewProps } from './MovementVoiceEntryView.contract';

function isRecordingState(kind: MovementVoiceEntryViewProps['required']['state']['voiceCapture']['kind']): boolean {
  return kind === 'recording' || kind === 'locked' || kind === 'requesting-permission' || kind === 'cancelling' || kind === 'stopping' || kind === 'transcribing' || kind === 'processing';
}

export function MovementVoiceEntryView({ required, provided }: MovementVoiceEntryViewProps) {
  const stopArmedRef = useRef(false);
  const voiceCaptureState = required.state.voiceCapture;
  const draftReadyState = voiceCaptureState.kind === 'draft-ready';
  const compactPipelineState = voiceCaptureState.kind === 'cancelling'
    || voiceCaptureState.kind === 'stopping'
    || voiceCaptureState.kind === 'transcribing'
    || voiceCaptureState.kind === 'processing';
  const {
    cancelVoicePipeline,
    onVoicePointerCancel,
    onVoicePointerDown,
    onVoicePointerMove,
    onVoicePointerUp,
    retryVoiceCapture,
    setMicrophoneButtonElement,
    stopLockedRecording,
  } = provided.commands;
  const voiceCaptureKind = voiceCaptureState.kind;
  const voiceCaptureBusy = voiceCaptureState.busy;
  const recordingState = isRecordingState(voiceCaptureState.kind) || draftReadyState;
  const capsuleClassName = [
    'movement-voice-entry-control',
    recordingState ? 'movement-voice-entry-control--recording' : '',
    voiceCaptureState.kind === 'failed' ? 'movement-voice-entry-control--failed' : '',
  ].filter(Boolean).join(' ');

  function handleMicrophoneClick() {
    if (voiceCaptureKind === 'failed') {
      retryVoiceCapture();
      return;
    }

    if (compactPipelineState) {
      cancelVoicePipeline?.();
      return;
    }

    if (voiceCaptureBusy) {
      return;
    }

    if (voiceCaptureKind === 'locked' || (voiceCaptureKind === 'recording' && stopArmedRef.current)) {
      stopLockedRecording();
    }
  }

  function bindPointerGesture(
    callback: (gesture: { pointerId: number; clientX: number; clientY: number }) => Promise<void> | void,
  ) {
    return async (event: ReactPointerEvent<HTMLButtonElement>) => {
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

  function bindPointerFinish(
    callback: (gesture: { pointerId: number }) => Promise<void> | void,
  ) {
    return async (event: ReactPointerEvent<HTMLButtonElement>) => {
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
    <section className={capsuleClassName} data-state={voiceCaptureState.kind} aria-label="Voice movement interpretation">
      <div className="movement-voice-entry-status">
        {voiceCaptureState.kind !== 'idle' ? (
          <span className="movement-voice-entry-status-headline" aria-live="polite">
            {compactPipelineState ? <i className="bi bi-arrow-repeat movement-voice-entry-spinner" aria-hidden /> : null}
            {!compactPipelineState && (voiceCaptureState.kind === 'recording' || voiceCaptureState.kind === 'locked') ? (
              <span className="movement-voice-entry-red-dot" aria-hidden />
            ) : null}
            {!compactPipelineState && voiceCaptureState.headline ? <span>{voiceCaptureState.headline}</span> : null}
          </span>
        ) : (
          <span aria-hidden />
        )}
        {!compactPipelineState && voiceCaptureState.kind !== 'failed' && voiceCaptureState.supportingText ? (
          <span className="movement-voice-entry-status-hint">{voiceCaptureState.supportingText}</span>
        ) : null}
      </div>

      <button
        ref={setMicrophoneButtonElement}
        type="button"
        className={recordingState ? 'movement-voice-entry-microphone movement-voice-entry-microphone--recording' : 'movement-voice-entry-microphone'}
        aria-label={compactPipelineState
          ? (required.config.cancelVoiceAriaLabel ?? required.config.stopLockedAriaLabel)
          : recordingState && !draftReadyState
            ? required.config.stopLockedAriaLabel
            : required.config.microphoneAriaLabel}
        aria-invalid={voiceCaptureKind === 'failed' ? 'true' : undefined}
        aria-pressed={voiceCaptureKind === 'recording' || voiceCaptureKind === 'locked'}
        onClick={handleMicrophoneClick}
        onPointerDown={(event) => {
          stopArmedRef.current = recordingState;
          void bindPointerGesture(onVoicePointerDown)(event);
        }}
        onPointerMove={bindPointerGesture(onVoicePointerMove)}
        onPointerUp={(event) => {
          if (voiceCaptureKind === 'locked') {
            stopArmedRef.current = false;
          }
          void bindPointerFinish(onVoicePointerUp)(event);
        }}
        onPointerCancel={(event) => {
          stopArmedRef.current = false;
          void bindPointerFinish(onVoicePointerCancel)(event);
        }}
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
    </section>
  );
}
