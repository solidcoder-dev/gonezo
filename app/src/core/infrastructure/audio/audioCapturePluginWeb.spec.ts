import { describe, expect, it } from 'vitest';
import { AudioCapturePluginWeb } from './audioCapturePluginWeb';

describe('AudioCapturePluginWeb', () => {
  it('keeps the audio bridge shape with deterministic run ids and discard semantics', async () => {
    const plugin = new AudioCapturePluginWeb();

    await expect(plugin.getMicrophonePermissionStatus()).rejects.toMatchObject({
      code: 'unsupported-device',
    });
    await expect(plugin.requestMicrophonePermission()).rejects.toMatchObject({
      code: 'unsupported-device',
    });
    await expect(plugin.openAppSettings()).rejects.toMatchObject({
      code: 'unsupported-device',
    });
    const session = await plugin.startRecording();
    expect(session.runId).toMatch(/[0-9a-f-]{36}/);
    expect(session.startedAt).toEqual(expect.any(Number));
    const result = await plugin.stopRecording();
    expect(result.runId).toBe(session.runId);
    expect(result.audioRef).toBe(session.runId);
    expect(result.mimeType).toBe('audio/wav');
    await expect(plugin.cancelRecording()).resolves.toBeUndefined();
    await expect(plugin.discardRun({ runId: session.runId })).resolves.toBeUndefined();
  });
});
