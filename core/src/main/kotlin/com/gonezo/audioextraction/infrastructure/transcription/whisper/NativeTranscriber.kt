package com.gonezo.audioextraction.infrastructure.transcription.whisper

interface NativeTranscriber {
  fun transcribe(
    modelPath: String,
    audio: PcmAudio,
    language: String? = null,
  ): String
}
