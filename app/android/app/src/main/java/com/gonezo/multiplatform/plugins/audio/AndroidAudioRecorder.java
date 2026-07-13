package com.gonezo.multiplatform.plugins.audio;

import android.media.AudioFormat;
import android.media.MediaRecorder;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

final class AndroidAudioRecorder {
  private static final int AUDIO_SOURCE = MediaRecorder.AudioSource.MIC;

  private final AtomicBoolean recording = new AtomicBoolean(false);
  private final AtomicReference<RuntimeException> asyncError = new AtomicReference<>();
  private final AtomicReference<AudioCaptureErrorCode> asyncErrorCode = new AtomicReference<>();
  private final AtomicReference<AudioRecordPort> activeAudioRecord = new AtomicReference<>();
  private final AudioRecordFactory audioRecordFactory;

  private File outputFile;
  private Thread worker;
  private CountDownLatch startupSignal;

  AndroidAudioRecorder() {
    this(new AndroidAudioRecordFactory());
  }

  AndroidAudioRecorder(AudioRecordFactory audioRecordFactory) {
    this.audioRecordFactory = audioRecordFactory;
  }

  void start(File nextOutputFile) throws AudioCapturePluginException {
    if (worker != null && worker.isAlive()) {
      throw new AudioCapturePluginException(
        AudioCaptureErrorCode.RECORDING_ALREADY_ACTIVE,
        "A recording is already active."
      );
    }
    outputFile = nextOutputFile;
    recording.set(true);
    asyncError.set(null);
    asyncErrorCode.set(null);
    startupSignal = new CountDownLatch(1);

    worker = new Thread(this::recordLoop, "GonezoAudioCaptureRecorder");
    worker.start();

    try {
      if (!startupSignal.await(AudioCaptureConfiguration.STOP_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
        recording.set(false);
        stopActiveAudioRecord();
        awaitWorkerShutdown();
        throw new AudioCapturePluginException(AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, "Audio capture did not start in time.");
      }
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new AudioCapturePluginException(AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, "Audio capture startup was interrupted.", exception);
    }

    RuntimeException startupFailure = asyncError.get();
    if (startupFailure != null) {
      awaitWorkerShutdown();
      throw new AudioCapturePluginException(AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, "Audio capture could not start.", startupFailure);
    }
  }

  void stopAndFinalize() throws AudioCapturePluginException {
    Thread currentWorker = worker;
    if (currentWorker == null) {
      throw new AudioCapturePluginException(
        AudioCaptureErrorCode.NO_ACTIVE_RECORDING,
        "No recording is active."
      );
    }
    recording.set(false);
    stopActiveAudioRecord();

    try {
      currentWorker.join(AudioCaptureConfiguration.STOP_TIMEOUT_MS);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new AudioCapturePluginException(
        AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE,
        "Audio capture was interrupted while stopping.",
        exception
      );
    }

    if (currentWorker.isAlive()) {
      throw new AudioCapturePluginException(
        AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE,
        "Audio capture worker did not stop in time."
      );
    }

    worker = null;

    AudioCaptureErrorCode failureCode = asyncErrorCode.getAndSet(null);
    if (failureCode != null) {
      throw new AudioCapturePluginException(failureCode, "Audio capture exceeded its configured limit.");
    }
    RuntimeException failure = asyncError.getAndSet(null);
    if (failure != null) {
      throw new AudioCapturePluginException(
        AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE,
        "Audio capture failed while recording.",
        failure
      );
    }
  }

  void cancelAndDelete() {
    recording.set(false);
    stopActiveAudioRecord();
    Thread currentWorker = worker;
    if (currentWorker != null) {
      try {
        currentWorker.join(AudioCaptureConfiguration.STOP_TIMEOUT_MS);
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
      }
      if (!currentWorker.isAlive()) {
        worker = null;
      }
    }
    if (currentWorker != null && currentWorker.isAlive()) {
      return;
    }
    File file = outputFile;
    outputFile = null;
    if (file != null && file.exists()) {
      //noinspection ResultOfMethodCallIgnored
      file.delete();
    }
    asyncError.set(null);
  }

  boolean hasActiveWorker() {
    return worker != null && worker.isAlive();
  }

  private void recordLoop() {
    int minBuffer = audioRecordFactory.getMinBufferSize(
      AudioCaptureConfiguration.SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    );
    if (minBuffer <= 0) {
      asyncError.set(new IllegalStateException("Cannot resolve the native audio capture buffer."));
      recording.set(false);
      startupSignal.countDown();
      return;
    }

    int bufferSize = Math.max(minBuffer * 2, 4_096);
    byte[] buffer = new byte[bufferSize];
    long pcmBytes = 0L;

    AudioRecordPort audioRecord = null;
    try (FileOutputStream output = new FileOutputStream(outputFile)) {
      output.write(new byte[44]);

      audioRecord = audioRecordFactory.create(
        AUDIO_SOURCE,
        AudioCaptureConfiguration.SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
      );

      if (audioRecord.getState() != AudioRecordPort.STATE_INITIALIZED) {
        throw new IllegalStateException("AudioRecord could not be initialized.");
      }

      activeAudioRecord.set(audioRecord);
      audioRecord.startRecording();
      long startedAt = System.currentTimeMillis();

      while (recording.get()) {
        int read = audioRecord.read(buffer, 0, buffer.length);
        if (read > 0) {
          output.write(buffer, 0, read);
          pcmBytes += read;
          startupSignal.countDown();
          if (System.currentTimeMillis() - startedAt >= AudioCaptureConfiguration.MAX_RECORDING_DURATION_MS) {
            recording.set(false);
          }
          if (pcmBytes > AudioCaptureConfiguration.MAX_RECORDING_SIZE_BYTES) {
            asyncErrorCode.set(AudioCaptureErrorCode.RECORDING_TOO_LARGE);
            recording.set(false);
          }
        } else if (read == AudioRecordPort.ERROR_INVALID_OPERATION || read == AudioRecordPort.ERROR_BAD_VALUE) {
          throw new IllegalStateException("AudioRecord read failed with code " + read + ".");
        }
      }

      output.flush();
      WavHeader.write(outputFile, pcmBytes);
    } catch (IOException exception) {
      asyncError.set(new IllegalStateException("Audio capture file could not be written.", exception));
    } catch (RuntimeException exception) {
      asyncError.set(exception);
    } finally {
      if (audioRecord != null) {
        try {
          if (audioRecord.getRecordingState() == AudioRecordPort.RECORDSTATE_RECORDING) {
            audioRecord.stop();
          }
        } catch (RuntimeException ignored) {
        }
        audioRecord.release();
        activeAudioRecord.compareAndSet(audioRecord, null);
      }
      recording.set(false);
      if (startupSignal != null) {
        startupSignal.countDown();
      }
    }
  }

  private void stopActiveAudioRecord() {
    AudioRecordPort audioRecord = activeAudioRecord.get();
    if (audioRecord == null) {
      return;
    }
    try {
      if (audioRecord.getRecordingState() == AudioRecordPort.RECORDSTATE_RECORDING) {
        audioRecord.stop();
      }
    } catch (RuntimeException ignored) {
    }
  }

  private void awaitWorkerShutdown() {
    Thread currentWorker = worker;
    if (currentWorker == null) {
      return;
    }
    try {
      currentWorker.join(AudioCaptureConfiguration.STOP_TIMEOUT_MS);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    }
    if (!currentWorker.isAlive()) {
      worker = null;
    }
  }

}
