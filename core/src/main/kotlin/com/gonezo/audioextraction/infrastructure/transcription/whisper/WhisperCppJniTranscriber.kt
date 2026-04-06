package com.gonezo.audioextraction.infrastructure.transcription.whisper

import java.util.concurrent.atomic.AtomicReference

class WhisperCppJniTranscriber(
  private val threadCountProvider: () -> Int = { Runtime.getRuntime().availableProcessors().coerceIn(1, 4) },
) : NativeTranscriber {
  private val activeModelPath = AtomicReference<String?>(null)
  @Volatile
  private var contextPtr: Long = 0L

  @Synchronized
  override fun transcribe(modelPath: String, audio: PcmAudio, language: String?): String {
    require(modelPath.isNotBlank()) { "Whisper model path is required" }
    if (audio.samples.isEmpty()) {
      return ""
    }

    ensureContext(modelPath)
    val resultCode = WhisperNativeBridge.fullTranscribe(
      contextPtr,
      threadCountProvider().coerceAtLeast(1),
      language,
      audio.samples,
    )
    if (resultCode != 0) {
      throw IllegalStateException("Whisper native transcription failed with code=$resultCode")
    }

    val count = WhisperNativeBridge.getTextSegmentCount(contextPtr)
    if (count <= 0) {
      return ""
    }
    val builder = StringBuilder()
    for (index in 0 until count) {
      val segment = WhisperNativeBridge.getTextSegment(contextPtr, index).trim()
      if (segment.isBlank()) {
        continue
      }
      if (builder.isNotEmpty()) {
        builder.append(' ')
      }
      builder.append(segment)
    }
    return builder.toString().trim()
  }

  @Synchronized
  fun close() {
    if (contextPtr != 0L) {
      WhisperNativeBridge.freeContext(contextPtr)
      contextPtr = 0L
    }
    activeModelPath.set(null)
  }

  @Synchronized
  private fun ensureContext(modelPath: String) {
    val current = activeModelPath.get()
    if (contextPtr != 0L && current == modelPath) {
      return
    }

    if (contextPtr != 0L) {
      WhisperNativeBridge.freeContext(contextPtr)
      contextPtr = 0L
    }

    val ptr = WhisperNativeBridge.initContext(modelPath)
    if (ptr == 0L) {
      throw IllegalStateException("Cannot initialize Whisper context from model path")
    }

    contextPtr = ptr
    activeModelPath.set(modelPath)
  }
}
