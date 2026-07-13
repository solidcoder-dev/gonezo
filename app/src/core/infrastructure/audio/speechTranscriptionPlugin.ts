import { registerPlugin } from '@capacitor/core';
import type { TranscriptSegment } from '../../../transactions/application/MovementVoiceEntry/SpeechTranscriptionPort';

export type SpeechTranscriptionPluginRequest = {
  runId: string;
  audioRef: string;
  language?: string;
  detectLanguageAutomatically?: boolean;
};

export type SpeechTranscriptionPluginResult = {
  language?: string;
  transcript?: { text: string; segments?: TranscriptSegment[] };
  error?: { code: string; message: string; recoverable: boolean; retryable: boolean };
};

export interface SpeechTranscriptionPlugin {
  transcribe(request: SpeechTranscriptionPluginRequest): Promise<SpeechTranscriptionPluginResult>;
  cancel(): Promise<void>;
}

export const SpeechTranscriptionPlugin = registerPlugin<SpeechTranscriptionPlugin>('SpeechTranscriptionPlugin', {
  web: () => import('./speechTranscriptionPluginWeb').then((module) => new module.SpeechTranscriptionPluginWeb()),
});
