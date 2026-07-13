import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CapturedAudio } from '../../../transactions/application/MovementVoiceEntry/movementVoiceCapture.types';

const isNativeRuntime = vi.fn();
const transcribe = vi.fn();
const cancel = vi.fn();

vi.mock('../runtimeAdapterSupport', () => ({
  isNativeRuntime,
}));

vi.mock('./speechTranscriptionPlugin', () => ({
  SpeechTranscriptionPlugin: {
    transcribe,
    cancel,
  },
}));

describe('createDefaultMovementVoiceEntryContext', () => {
  beforeEach(() => {
    vi.resetModules();
    isNativeRuntime.mockReset();
    transcribe.mockReset();
    cancel.mockReset();
  });

  it('keeps voice disabled on web', async () => {
    isNativeRuntime.mockReturnValue(false);

    const { createDefaultMovementVoiceEntryContext } = await import('./createDefaultMovementVoiceEntryContext');
    const context = createDefaultMovementVoiceEntryContext();

    expect(context.enabled).toBe(false);
    expect(context.interpretationRunExporter).toBeUndefined();
  });

  it('enables voice on native runtime', async () => {
    isNativeRuntime.mockReturnValue(true);

    const { createDefaultMovementVoiceEntryContext } = await import('./createDefaultMovementVoiceEntryContext');
    const context = createDefaultMovementVoiceEntryContext();

    expect(context.enabled).toBe(true);
    expect(context.interpretationRunExporter).toBeDefined();
  });

  it('injects Spanish transcription settings from the composition root', async () => {
    isNativeRuntime.mockReturnValue(true);
    transcribe.mockResolvedValue({
      transcript: { text: 'hola', segments: [] },
    });

    const { createDefaultMovementVoiceEntryContext } = await import('./createDefaultMovementVoiceEntryContext');
    const context = createDefaultMovementVoiceEntryContext();
    const audio = {
      runId: '11111111-1111-1111-1111-111111111111',
      audioRef: '11111111-1111-1111-1111-111111111111' as CapturedAudio['audioRef'],
    } as CapturedAudio;

    await context.transcribeVoiceInput.transcribe(audio);

    expect(transcribe).toHaveBeenCalledWith({
      runId: audio.runId,
      audioRef: audio.audioRef,
      language: 'es',
      detectLanguageAutomatically: false,
    });
  });
});
