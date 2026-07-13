package com.gonezo.multiplatform.plugins.speech

interface PcmDecoder {
  fun decode(wavBytes: ByteArray): PcmAudio
}
