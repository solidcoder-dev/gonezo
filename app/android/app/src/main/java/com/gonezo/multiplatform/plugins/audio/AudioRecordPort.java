package com.gonezo.multiplatform.plugins.audio;

interface AudioRecordPort {
  int STATE_INITIALIZED = 1;
  int RECORDSTATE_RECORDING = 3;
  int ERROR_INVALID_OPERATION = -3;
  int ERROR_BAD_VALUE = -2;

  int getState();

  void startRecording();

  int read(byte[] buffer, int offset, int size);

  int getRecordingState();

  void stop();

  void release();
}
