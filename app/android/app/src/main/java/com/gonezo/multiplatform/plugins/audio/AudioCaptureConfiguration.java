package com.gonezo.multiplatform.plugins.audio;

final class AudioCaptureConfiguration {
  static final long MIN_RECORDING_DURATION_MS = 350L;
  static final long MAX_RECORDING_DURATION_MS = 60_000L;
  static final long MAX_RECORDING_SIZE_BYTES = 2_000_000L;
  static final long STOP_TIMEOUT_MS = 5_000L;
  static final int SAMPLE_RATE = 16_000;
  static final int CHANNEL_COUNT = 1;
  static final int BITS_PER_SAMPLE = 16;

  private AudioCaptureConfiguration() {
  }
}
