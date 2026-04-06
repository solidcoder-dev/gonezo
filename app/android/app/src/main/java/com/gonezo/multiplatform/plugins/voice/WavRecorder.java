package com.gonezo.multiplatform.plugins.voice;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public final class WavRecorder {
  public static final int SAMPLE_RATE = 16_000;
  public static final int CHANNEL_COUNT = 1;
  public static final int BITS_PER_SAMPLE = 16;

  private static final int AUDIO_SOURCE = MediaRecorder.AudioSource.MIC;

  private final File outputFile;
  private final AtomicBoolean recording = new AtomicBoolean(false);
  private final AtomicReference<RuntimeException> asyncError = new AtomicReference<>();

  private Thread worker;

  public WavRecorder(File outputFile) {
    this.outputFile = outputFile;
  }

  public synchronized void start() throws IOException {
    if (worker != null) {
      throw new IllegalStateException("Recorder already started");
    }

    File parent = outputFile.getParentFile();
    if (parent != null && !parent.exists() && !parent.mkdirs()) {
      throw new IOException("Cannot create recording directory");
    }

    recording.set(true);
    asyncError.set(null);

    worker = new Thread(this::recordLoop, "GonezoWavRecorder");
    worker.start();
  }

  public synchronized void stopAndWait() {
    Thread currentWorker = worker;
    if (currentWorker == null) {
      return;
    }

    recording.set(false);

    try {
      currentWorker.join(5_000L);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while stopping recorder", ex);
    } finally {
      worker = null;
    }

    RuntimeException failure = asyncError.getAndSet(null);
    if (failure != null) {
      throw failure;
    }
  }

  private void recordLoop() {
    int minBuffer = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    );
    if (minBuffer <= 0) {
      asyncError.set(new IllegalStateException("Cannot resolve min buffer size for AudioRecord"));
      recording.set(false);
      return;
    }

    int bufferSize = Math.max(minBuffer * 2, 4096);
    byte[] buffer = new byte[bufferSize];
    long pcmBytes = 0L;

    AudioRecord audioRecord = null;
    try (FileOutputStream output = new FileOutputStream(outputFile)) {
      output.write(new byte[44]);

      audioRecord = new AudioRecord(
        AUDIO_SOURCE,
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
      );

      if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
        throw new IllegalStateException("AudioRecord could not be initialized");
      }

      audioRecord.startRecording();

      while (recording.get()) {
        int read = audioRecord.read(buffer, 0, buffer.length);
        if (read > 0) {
          output.write(buffer, 0, read);
          pcmBytes += read;
        } else if (read == AudioRecord.ERROR_INVALID_OPERATION || read == AudioRecord.ERROR_BAD_VALUE) {
          throw new IllegalStateException("AudioRecord read failed with code=" + read);
        }
      }

      output.flush();
      rewriteWaveHeader(outputFile, pcmBytes);
    } catch (IOException ex) {
      asyncError.set(new IllegalStateException("Failed to write WAV recording", ex));
    } catch (RuntimeException ex) {
      asyncError.set(ex);
    } finally {
      if (audioRecord != null) {
        try {
          if (audioRecord.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) {
            audioRecord.stop();
          }
        } catch (RuntimeException ignored) {
          // no-op
        }
        audioRecord.release();
      }
      recording.set(false);
    }
  }

  private static void rewriteWaveHeader(File file, long pcmBytes) throws IOException {
    long totalDataLen = pcmBytes + 36;
    long byteRate = (long) SAMPLE_RATE * CHANNEL_COUNT * BITS_PER_SAMPLE / 8;

    byte[] header = new byte[44];
    header[0] = 'R';
    header[1] = 'I';
    header[2] = 'F';
    header[3] = 'F';

    writeIntLE(header, 4, (int) totalDataLen);
    header[8] = 'W';
    header[9] = 'A';
    header[10] = 'V';
    header[11] = 'E';

    header[12] = 'f';
    header[13] = 'm';
    header[14] = 't';
    header[15] = ' ';

    writeIntLE(header, 16, 16);
    writeShortLE(header, 20, (short) 1);
    writeShortLE(header, 22, (short) CHANNEL_COUNT);
    writeIntLE(header, 24, SAMPLE_RATE);
    writeIntLE(header, 28, (int) byteRate);
    writeShortLE(header, 32, (short) (CHANNEL_COUNT * BITS_PER_SAMPLE / 8));
    writeShortLE(header, 34, (short) BITS_PER_SAMPLE);

    header[36] = 'd';
    header[37] = 'a';
    header[38] = 't';
    header[39] = 'a';
    writeIntLE(header, 40, (int) pcmBytes);

    try (RandomAccessFile raf = new RandomAccessFile(file, "rw")) {
      raf.seek(0L);
      raf.write(header);
    }
  }

  private static void writeIntLE(byte[] target, int offset, int value) {
    target[offset] = (byte) (value & 0xFF);
    target[offset + 1] = (byte) ((value >> 8) & 0xFF);
    target[offset + 2] = (byte) ((value >> 16) & 0xFF);
    target[offset + 3] = (byte) ((value >> 24) & 0xFF);
  }

  private static void writeShortLE(byte[] target, int offset, short value) {
    target[offset] = (byte) (value & 0xFF);
    target[offset + 1] = (byte) ((value >> 8) & 0xFF);
  }
}
