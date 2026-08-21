package com.gonezo.multiplatform.infrastructure.transcription.whisper

import dev.solidcoder.speech.AudioChunk
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RollingAudioWindowTest {
  @Test
  fun waitsForMinimumAudioBeforeFinalInference() {
    val window = RollingAudioWindow(sampleRateHz = 10, processingWindowMs = 1_000, overlapMs = 200, minimumProcessingAudioMs = 400)
    window.append(AudioChunk(FloatArray(3), 10))

    assertNull(window.takeReadyWindow(finalize = true))
  }

  @Test
  fun retainsOnlyConfiguredOverlapAfterAReadyWindow() {
    val window = RollingAudioWindow(sampleRateHz = 10, processingWindowMs = 1_000, overlapMs = 200, minimumProcessingAudioMs = 400)
    window.append(AudioChunk(FloatArray(10) { it.toFloat() }, 10))

    assertArrayEquals(FloatArray(10) { it.toFloat() }, window.takeReadyWindow(), 0f)
    window.append(AudioChunk(floatArrayOf(10f, 11f), 10))
    assertArrayEquals(floatArrayOf(8f, 9f, 10f, 11f), window.takeReadyWindow(finalize = true), 0f)
  }

  @Test
  fun preservesOrderAcrossCircularBufferWrapAround() {
    val window = RollingAudioWindow(sampleRateHz = 10, processingWindowMs = 1_000, overlapMs = 200, minimumProcessingAudioMs = 400)

    window.append(AudioChunk(FloatArray(10) { it.toFloat() }, 10))
    window.takeReadyWindow()
    window.append(AudioChunk(FloatArray(10) { (10 + it).toFloat() }, 10))

    assertArrayEquals(FloatArray(10) { (8 + it).toFloat() }, window.takeReadyWindow(), 0f)
    assertArrayEquals(floatArrayOf(16f, 17f, 18f, 19f), window.takeReadyWindow(finalize = true), 0f)
  }

  @Test
  fun acceptsAChunkLargerThanTheInitialCapacityWithoutDroppingSamples() {
    val window = RollingAudioWindow(sampleRateHz = 10, processingWindowMs = 1_000, overlapMs = 200, minimumProcessingAudioMs = 400)
    val samples = FloatArray(24) { it.toFloat() }

    window.append(AudioChunk(samples, 10))

    assertArrayEquals(FloatArray(10) { it.toFloat() }, window.takeReadyWindow(), 0f)
    assertArrayEquals(FloatArray(10) { (8 + it).toFloat() }, window.takeReadyWindow(), 0f)
    assertArrayEquals(FloatArray(8) { (16 + it).toFloat() }, window.takeReadyWindow(finalize = true), 0f)
  }
}
