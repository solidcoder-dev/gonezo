package com.gonezo.audioextraction.infrastructure.transcription.whisper

data class PcmAudio(
  val samples: FloatArray,
  val sampleRate: Int,
)
