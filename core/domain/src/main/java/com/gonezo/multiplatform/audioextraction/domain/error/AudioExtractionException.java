package com.gonezo.multiplatform.audioextraction.domain.error;

public class AudioExtractionException extends RuntimeException {
  private final ErrorCode code;

  public AudioExtractionException(ErrorCode code, String message) {
    super(message);
    this.code = code;
  }

  public AudioExtractionException(ErrorCode code, String message, Throwable cause) {
    super(message, cause);
    this.code = code;
  }

  public ErrorCode code() {
    return code;
  }
}
