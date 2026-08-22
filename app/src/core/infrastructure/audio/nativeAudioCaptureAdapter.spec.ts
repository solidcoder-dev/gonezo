import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NativeAudioCaptureAdapter } from './nativeAudioCaptureAdapter';

const { startRecording, stopRecording, cancelRecording, discardRun } = vi.hoisted(() => ({
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  cancelRecording: vi.fn(),
  discardRun: vi.fn(),
}));

vi.mock('./audioCapturePlugin', () => ({
  AudioCapturePlugin: { startRecording, stopRecording, cancelRecording, discardRun },
}));

describe('NativeAudioCaptureAdapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    startRecording.mockResolvedValue({ runId: 'run-1', startedAt: 10 });
    cancelRecording.mockResolvedValue(undefined);
  });

  it('starts recording and triggers interpretation preparation asynchronously', async () => {
    const prepare = vi.fn().mockResolvedValue(undefined);
    const adapter = new NativeAudioCaptureAdapter({ prepare, cancel: vi.fn() });

    await expect(adapter.start()).resolves.toEqual({ runId: 'run-1', startedAt: 10 });

    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledTimes(1);
  });

  it('does not delay recording while interpretation preparation is slow', async () => {
    let completePreparation!: () => void;
    const prepare = vi.fn(() => new Promise<void>((resolve) => { completePreparation = resolve; }));
    const cancel = vi.fn();
    const adapter = new NativeAudioCaptureAdapter({ prepare, cancel });

    await expect(adapter.start()).resolves.toEqual({ runId: 'run-1', startedAt: 10 });
    expect(prepare).toHaveBeenCalledTimes(1);

    completePreparation();
  });

  it('cancels interpretation preparation with the owning recording operation', async () => {
    const cancel = vi.fn();
    const adapter = new NativeAudioCaptureAdapter({ prepare: vi.fn().mockResolvedValue(undefined), cancel });

    await adapter.cancel();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancelRecording).toHaveBeenCalledTimes(1);
  });
});
