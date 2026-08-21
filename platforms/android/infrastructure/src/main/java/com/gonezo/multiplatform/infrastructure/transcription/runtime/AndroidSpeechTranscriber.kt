package com.gonezo.multiplatform.infrastructure.transcription.runtime

import dev.solidcoder.speech.SpeechTranscriber

internal interface AndroidSpeechTranscriber : SpeechTranscriber {
  fun transcribeBlocking(request: dev.solidcoder.speech.TranscriptionRequest): dev.solidcoder.speech.TranscriptionResult

  fun cancelBlocking()

  fun close()
}
