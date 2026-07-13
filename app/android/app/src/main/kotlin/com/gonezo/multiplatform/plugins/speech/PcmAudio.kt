package com.gonezo.multiplatform.plugins.speech

data class PcmAudio(
  val samples: FloatArray,
  val sampleRate: Int,
)
