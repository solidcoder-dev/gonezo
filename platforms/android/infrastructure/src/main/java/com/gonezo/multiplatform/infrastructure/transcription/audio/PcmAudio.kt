package com.gonezo.multiplatform.infrastructure.transcription.audio

data class PcmAudio(
  val samples: FloatArray,
  val sampleRate: Int,
)
