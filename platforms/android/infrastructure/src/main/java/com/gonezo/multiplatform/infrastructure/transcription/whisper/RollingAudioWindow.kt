package com.gonezo.multiplatform.infrastructure.transcription.whisper

import dev.solidcoder.speech.AudioChunk

internal class RollingAudioWindow(
  private val sampleRateHz: Int,
  private val processingWindowMs: Int = PROCESSING_WINDOW_MS,
  private val overlapMs: Int = OVERLAP_MS,
  private val minimumProcessingAudioMs: Int = MIN_PROCESSING_AUDIO_MS,
) {
  private val samples = ArrayList<Float>()
  private val processingWindowSamples = sampleRateHz * processingWindowMs / 1_000
  private val overlapSamples = sampleRateHz * overlapMs / 1_000
  private val minimumProcessingSamples = sampleRateHz * minimumProcessingAudioMs / 1_000

  init {
    require(sampleRateHz > 0)
    require(processingWindowMs > overlapMs)
    require(overlapMs >= 0)
    require(minimumProcessingAudioMs > 0)
  }

  fun append(chunk: AudioChunk) {
    require(chunk.sampleRateHz == sampleRateHz) { "audio chunks must use one sample rate" }
    samples.ensureCapacity(samples.size + chunk.samples.size)
    chunk.samples.forEach(samples::add)
  }

  fun takeReadyWindow(finalize: Boolean = false): FloatArray? {
    if (samples.size >= processingWindowSamples) {
      return removeWindow(processingWindowSamples, processingWindowSamples - overlapSamples)
    }
    if (finalize && samples.size >= minimumProcessingSamples) {
      return removeWindow(samples.size, samples.size)
    }
    return null
  }

  fun hasRemainingAudio(): Boolean = samples.isNotEmpty()

  private fun removeWindow(windowSize: Int, consumedSize: Int): FloatArray {
    val window = samples.take(windowSize).toFloatArray()
    repeat(consumedSize) { samples.removeAt(0) }
    return window
  }

  companion object {
    const val PROCESSING_WINDOW_MS = 2_000
    const val OVERLAP_MS = 500
    const val MIN_PROCESSING_AUDIO_MS = 400
  }
}
