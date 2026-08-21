package com.gonezo.multiplatform.infrastructure.transcription.runtime

import dev.solidcoder.speech.AudioChunk
import dev.solidcoder.speech.StreamingSpeechTranscriber
import dev.solidcoder.speech.StreamingTranscriptionRequest
import dev.solidcoder.speech.StreamingTranscriptionSession
import dev.solidcoder.speech.TranscriptionResult

internal interface AndroidStreamingSpeechTranscriber : AndroidTranscriber, StreamingSpeechTranscriber {
  fun startBlocking(request: StreamingTranscriptionRequest): AndroidStreamingTranscriptionSession
}

internal interface AndroidStreamingTranscriptionSession : StreamingTranscriptionSession {
    fun acceptPcm16NonBlocking(bytes: ByteArray, length: Int)

    fun acceptBlocking(chunk: AudioChunk)

    fun finishBlocking(): TranscriptionResult

    fun cancelBlocking()
}
