package com.gonezo.audioextraction.infrastructure.transcription.whisper

interface ModelProvider {
  fun modelPath(): String
}
