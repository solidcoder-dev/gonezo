package com.gonezo.multiplatform.plugins.speech

import dev.solidcoder.speech.SpeechTranscriber

internal interface AndroidSpeechTranscriber : SpeechTranscriber {
  fun transcribeBlocking(request: dev.solidcoder.speech.TranscriptionRequest): dev.solidcoder.speech.TranscriptionResult

  fun cancelBlocking()

  fun close()
}
