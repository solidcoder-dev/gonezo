package com.gonezo.multiplatform.plugins.audio;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.file.Files;
import org.junit.Test;

public final class AndroidAudioRecorderTest {
  @Test
  public void recordsThroughTheAudioRecordPortAndWritesAValidWav() throws Exception {
    File output = Files.createTempFile("gonezo-audio", ".wav").toFile();
    FakeAudioRecordFactory factory = new FakeAudioRecordFactory();
    AndroidAudioRecorder recorder = new AndroidAudioRecorder(factory);

    recorder.start(output);
    assertTrue(factory.record.started);
    recorder.stopAndFinalize();

    assertFalse(recorder.hasActiveWorker());
    assertEquals(44 + 4, output.length());
    assertEquals('R', Files.readAllBytes(output.toPath())[0]);
    output.delete();
  }

  @Test
  public void rejectsASecondStartAndAllowsAnIdempotentCancel() throws Exception {
    File output = Files.createTempFile("gonezo-audio", ".wav").toFile();
    AndroidAudioRecorder recorder = new AndroidAudioRecorder(new FakeAudioRecordFactory());

    recorder.start(output);
    try {
      recorder.start(output);
    } catch (AudioCapturePluginException exception) {
      assertEquals(AudioCaptureErrorCode.RECORDING_ALREADY_ACTIVE, exception.code());
    }
    recorder.cancelAndDelete();
    recorder.cancelAndDelete();
    assertFalse(output.exists());
  }

  @Test
  public void mapsAudioRecordInitializationFailureAndLeavesTheRecorderReusable() throws Exception {
    File output = Files.createTempFile("gonezo-audio", ".wav").toFile();
    AndroidAudioRecorder recorder = new AndroidAudioRecorder(new FakeAudioRecordFactory(0));

    try {
      recorder.start(output);
    } catch (AudioCapturePluginException exception) {
      assertEquals(AudioCaptureErrorCode.NATIVE_RECORDER_FAILURE, exception.code());
    }
    assertFalse(recorder.hasActiveWorker());
    output.delete();
  }

  private static final class FakeAudioRecordFactory implements AudioRecordFactory {
    private final FakeAudioRecord record;

    private FakeAudioRecordFactory() {
      this(1);
    }

    private FakeAudioRecordFactory(int state) {
      record = new FakeAudioRecord(state);
    }

    @Override
    public int getMinBufferSize(int sampleRate, int channelConfig, int audioFormat) {
      return 4;
    }

    @Override
    public AudioRecordPort create(int audioSource, int sampleRate, int channelConfig, int audioFormat, int bufferSize) {
      return record;
    }
  }

  private static final class FakeAudioRecord implements AudioRecordPort {
    private final int state;
    private boolean started;
    private boolean recording;
    private boolean delivered;

    private FakeAudioRecord(int state) {
      this.state = state;
    }

    @Override
    public int getState() {
      return state;
    }

    @Override
    public void startRecording() {
      started = true;
      recording = true;
    }

    @Override
    public int read(byte[] buffer, int offset, int size) {
      if (!recording || delivered) {
        return 0;
      }
      delivered = true;
      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 1;
      buffer[offset + 3] = 0;
      return 4;
    }

    @Override
    public int getRecordingState() {
      return recording ? 3 : 1;
    }

    @Override
    public void stop() {
      recording = false;
    }

    @Override
    public void release() {
      recording = false;
    }
  }
}
