package com.gonezo.multiplatform.plugins.audio;

interface PcmChunkListener {
  void onPcmChunk(byte[] buffer, int length);
}
