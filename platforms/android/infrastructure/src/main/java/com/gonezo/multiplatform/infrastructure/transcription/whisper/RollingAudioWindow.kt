package com.gonezo.multiplatform.infrastructure.transcription.whisper

import dev.solidcoder.speech.AudioChunk

internal class RollingAudioWindow(
  private val sampleRateHz: Int,
  private val processingWindowMs: Int = PROCESSING_WINDOW_MS,
  private val overlapMs: Int = OVERLAP_MS,
  private val minimumProcessingAudioMs: Int = MIN_PROCESSING_AUDIO_MS,
) {
  private val processingWindowSamples = sampleRateHz * processingWindowMs / 1_000
  private val overlapSamples = sampleRateHz * overlapMs / 1_000
  private val minimumProcessingSamples = sampleRateHz * minimumProcessingAudioMs / 1_000
  private var buffer = FloatArray(processingWindowSamples.coerceAtLeast(1))
  private var readIndex = 0
  private var writeIndex = 0
  private var size = 0

  init {
    require(sampleRateHz > 0)
    require(processingWindowMs > overlapMs)
    require(overlapMs >= 0)
    require(minimumProcessingAudioMs > 0)
  }

  fun append(chunk: AudioChunk) {
    require(chunk.sampleRateHz == sampleRateHz) { "audio chunks must use one sample rate" }
    ensureCapacity(size + chunk.samples.size)
    chunk.samples.forEach { sample ->
      buffer[writeIndex] = sample
      writeIndex = (writeIndex + 1) % buffer.size
      size++
    }
  }

  fun takeReadyWindow(finalize: Boolean = false): FloatArray? {
    if (size >= processingWindowSamples) {
      return removeWindow(processingWindowSamples, processingWindowSamples - overlapSamples)
    }
    if (finalize && size >= minimumProcessingSamples) {
      return removeWindow(size, size)
    }
    return null
  }

  fun hasRemainingAudio(): Boolean = size > 0

  private fun removeWindow(windowSize: Int, consumedSize: Int): FloatArray {
    val window = FloatArray(windowSize)
    var index = readIndex
    repeat(windowSize) {
      window[it] = buffer[index]
      index = (index + 1) % buffer.size
    }
    readIndex = (readIndex + consumedSize) % buffer.size
    size -= consumedSize
    return window
  }

  private fun ensureCapacity(requiredSize: Int) {
    if (requiredSize <= buffer.size) return
    var newCapacity = buffer.size
    while (newCapacity < requiredSize) newCapacity *= 2
    val expanded = FloatArray(newCapacity)
    var index = readIndex
    repeat(size) {
      expanded[it] = buffer[index]
      index = (index + 1) % buffer.size
    }
    buffer = expanded
    readIndex = 0
    writeIndex = size
  }

  companion object {
    const val PROCESSING_WINDOW_MS = 2_000
    const val OVERLAP_MS = 500
    const val MIN_PROCESSING_AUDIO_MS = 400
  }
}
