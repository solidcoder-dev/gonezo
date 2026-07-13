package dev.solidcoder.speech

interface SpeechTranscriber {
  suspend fun transcribe(request: TranscriptionRequest): TranscriptionResult
}
