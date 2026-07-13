import { WebPlugin } from '@capacitor/core';
import type { SpeechTranscriptionPlugin, SpeechTranscriptionPluginRequest, SpeechTranscriptionPluginResult } from './speechTranscriptionPlugin';

export class SpeechTranscriptionPluginWeb extends WebPlugin implements SpeechTranscriptionPlugin {
  async transcribe(request: SpeechTranscriptionPluginRequest): Promise<SpeechTranscriptionPluginResult> {
    void request;
    return {
      error: {
        code: 'transcription-unavailable',
        message: 'Local speech transcription is only available on Android right now.',
        recoverable: false,
        retryable: false,
      },
    };
  }

  async cancel(): Promise<void> {
    return undefined;
  }
}
