import { describe, expect, it, vi } from 'vitest';
import { TranscribeVoiceInput } from './TranscribeVoiceInput';
import type { CapturedAudio } from './movementVoiceCapture.types';
import type { SpeechTranscriptionPort } from './SpeechTranscriptionPort';
import type { TranscriptionSettings } from './TranscriptionSettings';

const audio: CapturedAudio = {
  runId: '11111111-1111-1111-1111-111111111111',
  audioRef: '11111111-1111-1111-1111-111111111111' as CapturedAudio['audioRef'],
  mimeType: 'audio/wav',
  durationMs: 2_000,
  sizeBytes: 64_000,
};

describe('TranscribeVoiceInput', () => {
  const settings: TranscriptionSettings = {
    language: 'es',
    detectLanguageAutomatically: false,
  };

  it('forwards the run id and audio reference to speech transcription', async () => {
    const speechTranscription: SpeechTranscriptionPort = {
      transcribe: vi.fn(async () => ({ transcript: { text: 'café' } })),
      cancel: vi.fn(async () => undefined),
    };
    const useCase = new TranscribeVoiceInput(speechTranscription, settings);

    await expect(useCase.transcribe(audio)).resolves.toEqual({ transcript: { text: 'café' } });

    expect(speechTranscription.transcribe).toHaveBeenCalledWith({
      runId: audio.runId,
      audioRef: audio.audioRef,
      language: 'es',
      detectLanguageAutomatically: false,
    });
  });

  it('cancels only the speech transcription port', async () => {
    const speechTranscription: SpeechTranscriptionPort = {
      transcribe: vi.fn(async () => ({ transcript: { text: 'café' } })),
      cancel: vi.fn(async () => undefined),
    };
    const useCase = new TranscribeVoiceInput(speechTranscription, settings);

    await useCase.cancel();

    expect(speechTranscription.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not depend on audio capture for cancellation', async () => {
    const speechTranscription: SpeechTranscriptionPort = {
      transcribe: vi.fn(async () => ({ transcript: { text: 'café' } })),
      cancel: vi.fn(async () => undefined),
    };
    const useCase = new TranscribeVoiceInput(speechTranscription, settings);

    await useCase.cancel();

    expect(speechTranscription.cancel).toHaveBeenCalledTimes(1);
  });

  it('never discards a run during cancellation', async () => {
    const speechTranscription: SpeechTranscriptionPort = {
      transcribe: vi.fn(async () => ({ transcript: { text: 'café' } })),
      cancel: vi.fn(async () => undefined),
    };
    const useCase = new TranscribeVoiceInput(speechTranscription, settings);

    await useCase.cancel();

    expect(Object.prototype.hasOwnProperty.call(useCase, 'audioCapture')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(useCase, 'activeAudio')).toBe(false);
  });
});
