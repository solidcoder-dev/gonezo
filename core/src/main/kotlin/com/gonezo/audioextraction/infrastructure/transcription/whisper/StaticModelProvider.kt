package com.gonezo.audioextraction.infrastructure.transcription.whisper

class StaticModelProvider(
  private val absoluteModelPath: String,
) : ModelProvider {
  override fun modelPath(): String = absoluteModelPath
}
