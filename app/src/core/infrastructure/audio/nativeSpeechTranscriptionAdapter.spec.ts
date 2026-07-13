import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeechTranscriptionResult } from '../../../transactions/application/MovementVoiceEntry/SpeechTranscriptionPort';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const transcribe = vi.fn();
const cancel = vi.fn();

vi.mock('./speechTranscriptionPlugin', () => ({
  SpeechTranscriptionPlugin: {
    transcribe,
    cancel,
  },
}));

describe('NativeSpeechTranscriptionAdapter', () => {
  beforeEach(() => {
    vi.resetModules();
    transcribe.mockReset();
    cancel.mockReset();
  });

  it('forwards the run id to the native transcription plugin', async () => {
    transcribe.mockResolvedValue({
      transcript: { text: 'Lunch' },
    } satisfies SpeechTranscriptionResult);

    const { NativeSpeechTranscriptionAdapter } = await import('./nativeSpeechTranscriptionAdapter');
    const adapter = new NativeSpeechTranscriptionAdapter();

    await expect(adapter.transcribe({
      runId: '11111111-1111-1111-1111-111111111111',
      audioRef: '11111111-1111-1111-1111-111111111111' as never,
    })).resolves.toEqual({
      transcript: { text: 'Lunch' },
    });

    expect(transcribe).toHaveBeenCalledWith({
      runId: '11111111-1111-1111-1111-111111111111',
      audioRef: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('waits for the plugin to finish cancelling', async () => {
    const deferred = createDeferred<void>();
    cancel.mockReturnValue(deferred.promise);

    const { NativeSpeechTranscriptionAdapter } = await import('./nativeSpeechTranscriptionAdapter');
    const adapter = new NativeSpeechTranscriptionAdapter();

    const cancelPromise = adapter.cancel();
    expect(cancel).toHaveBeenCalledTimes(1);

    let settled = false;
    cancelPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    deferred.resolve(undefined);
    await expect(cancelPromise).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });

  it('propagates cancellation failures from the plugin', async () => {
    cancel.mockRejectedValue({
      code: 'transcription-cancellation-failed',
      message: 'Speech transcription cancellation timed out.',
      recoverable: true,
    });

    const { NativeSpeechTranscriptionAdapter } = await import('./nativeSpeechTranscriptionAdapter');
    const adapter = new NativeSpeechTranscriptionAdapter();

    await expect(adapter.cancel()).rejects.toEqual({
      code: 'transcription-cancellation-failed',
      message: 'Speech transcription cancellation timed out.',
      recoverable: true,
    });
  });
});
