package com.gonezo.multiplatform.plugins.audio;

enum AudioCaptureErrorCode {
  PERMISSION_DENIED("permission-denied"),
  PERMISSION_PERMANENTLY_DENIED("permission-permanently-denied"),
  RECORDING_ALREADY_ACTIVE("recording-already-active"),
  NO_ACTIVE_RECORDING("no-active-recording"),
  RECORDING_TOO_SHORT("recording-too-short"),
  RECORDING_TOO_LARGE("recording-too-large"),
  EMPTY_AUDIO("empty-audio"),
  NATIVE_RECORDER_FAILURE("native-recorder-failure"),
  ARTIFACT_STORAGE_FAILED("artifact-storage-failed"),
  CAPTURE_CANCELLED("capture-cancelled"),
  UNSUPPORTED_DEVICE("unsupported-device");

  private final String wireValue;

  AudioCaptureErrorCode(String wireValue) {
    this.wireValue = wireValue;
  }

  String wireValue() {
    return wireValue;
  }
}
