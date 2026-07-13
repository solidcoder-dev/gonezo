import { describe, expect, it } from 'vitest';
import { SpeechTranscriptionPluginWeb } from './speechTranscriptionPluginWeb';

describe('SpeechTranscriptionPluginWeb', () => {
  it('reports the unavailable local capability without exposing a native exception', async () => {
    const result = await new SpeechTranscriptionPluginWeb().transcribe({
      runId: '11111111-1111-1111-1111-111111111111',
      audioRef: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.error).toMatchObject({ code: 'transcription-unavailable', recoverable: false, retryable: false });
  });
});
