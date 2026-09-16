package com.gonezo.multiplatform.infrastructure.transcription.runtime

import dev.solidcoder.speech.SpeechTranscriber

internal interface AndroidTranscriber {
  fun close()
}

internal interface AndroidSpeechTranscriber : AndroidTranscriber, SpeechTranscriber {
  fun transcribeBlocking(request: dev.solidcoder.speech.TranscriptionRequest): dev.solidcoder.speech.TranscriptionResult

  fun cancelBlocking()

  override fun close()
}

internal interface OnDeviceSpeechRecognizer {
  fun setRecognitionListener(listener: android.speech.RecognitionListener)

  fun startListening(intent: android.content.Intent)

  fun stopListening()

  fun cancel()

  fun destroy()
}
