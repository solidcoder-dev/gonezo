package com.gonezo.multiplatform.plugins.audio;

import android.media.AudioFormat;
import android.media.AudioRecord;

final class AndroidAudioRecordFactory implements AudioRecordFactory {
  @Override
  public int getMinBufferSize(int sampleRate, int channelConfig, int audioFormat) {
    return AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
  }

  @Override
  public AudioRecordPort create(int audioSource, int sampleRate, int channelConfig, int audioFormat, int bufferSize) {
    return new PlatformAudioRecord(new AudioRecord(audioSource, sampleRate, channelConfig, audioFormat, bufferSize));
  }

  private static final class PlatformAudioRecord implements AudioRecordPort {
    private final AudioRecord delegate;

    private PlatformAudioRecord(AudioRecord delegate) {
      this.delegate = delegate;
    }

    @Override
    public int getState() {
      return delegate.getState();
    }

    @Override
    public void startRecording() {
      delegate.startRecording();
    }

    @Override
    public int read(byte[] buffer, int offset, int size) {
      return delegate.read(buffer, offset, size);
    }

    @Override
    public int getRecordingState() {
      return delegate.getRecordingState();
    }

    @Override
    public void stop() {
      delegate.stop();
    }

    @Override
    public void release() {
      delegate.release();
    }
  }
}
