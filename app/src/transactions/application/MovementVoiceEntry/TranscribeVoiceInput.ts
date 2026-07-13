import type { CapturedAudio } from './movementVoiceCapture.types';
import type { TranscriptionSettings } from './TranscriptionSettings';
import type { SpeechTranscriptionPort, SpeechTranscriptionResult } from './SpeechTranscriptionPort';

export interface TranscribeVoiceInputPort {
  transcribe(audio: CapturedAudio): Promise<SpeechTranscriptionResult>;
  cancel(): Promise<void>;
}

export class TranscribeVoiceInput implements TranscribeVoiceInputPort {
  private readonly speechTranscription: SpeechTranscriptionPort;
  private readonly settings: TranscriptionSettings;

  constructor(
    speechTranscription: SpeechTranscriptionPort,
    settings: TranscriptionSettings,
  ) {
    this.speechTranscription = speechTranscription;
    this.settings = settings;
  }

  transcribe(audio: CapturedAudio): Promise<SpeechTranscriptionResult> {
    return this.speechTranscription.transcribe({
      runId: audio.runId,
      audioRef: audio.audioRef,
      language: this.settings.language,
      detectLanguageAutomatically: this.settings.detectLanguageAutomatically,
    });
  }

  async cancel(): Promise<void> {
    await this.speechTranscription.cancel();
  }
}
