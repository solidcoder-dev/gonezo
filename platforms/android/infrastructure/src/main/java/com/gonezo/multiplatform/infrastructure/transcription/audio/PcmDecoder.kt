package com.gonezo.multiplatform.infrastructure.transcription.audio

interface PcmDecoder {
  fun decode(wavBytes: ByteArray): PcmAudio
}
