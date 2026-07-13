package com.gonezo.multiplatform.plugins.audio;

public final class AudioCapturePluginException extends Exception {
  private final AudioCaptureErrorCode code;

  AudioCapturePluginException(AudioCaptureErrorCode code, String message) {
    super(message);
    this.code = code;
  }

  AudioCapturePluginException(AudioCaptureErrorCode code, String message, Throwable cause) {
    super(message, cause);
    this.code = code;
  }

  AudioCaptureErrorCode code() {
    return code;
  }
}
