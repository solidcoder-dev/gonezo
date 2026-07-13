package com.gonezo.multiplatform.plugins.audio;

interface AudioRecordFactory {
  int getMinBufferSize(int sampleRate, int channelConfig, int audioFormat);

  AudioRecordPort create(int audioSource, int sampleRate, int channelConfig, int audioFormat, int bufferSize);
}
