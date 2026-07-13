package com.gonezo.multiplatform.plugins.speech.preprocessing

import com.gonezo.multiplatform.plugins.speech.PcmAudio
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EnergyBasedSpeechAudioPreprocessorTest {
  private val settings = SpeechAudioPreprocessingSettings(
    windowDurationMs = 25,
    minimumAbsoluteRms = 0.006f,
    noiseFloorMultiplier = 3.0f,
    minimumSpeechDurationMs = 250,
    paddingDurationMs = 200,
  )

  @Test
  fun emptyAudioReturnsNoSpeech() {
    assertEquals(SpeechAudioPreparation.NoSpeech, EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(FloatArray(0), 16_000)))
  }

  @Test
  fun silenceReturnsNoSpeech() {
    assertEquals(SpeechAudioPreparation.NoSpeech, EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(FloatArray(16_000), 16_000)))
  }

  @Test
  fun lowNoiseReturnsNoSpeech() {
    val samples = FloatArray(16_000) { 0.003f }
    assertEquals(SpeechAudioPreparation.NoSpeech, EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(samples, 16_000)))
  }

  @Test
  fun shortSpeechReturnsNoSpeech() {
    val samples = FloatArray(16_000) { index -> if (index in 2_000 until 2_150) 0.2f else 0f }
    assertEquals(SpeechAudioPreparation.NoSpeech, EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(samples, 16_000)))
  }

  @Test
  fun speechWrappedInSilenceReturnsReadyWithPadding() {
    val samples = FloatArray(16_000) { index -> if (index in 4_000 until 8_000) 0.2f else 0f }
    val original = samples.copyOf()

    val preparation = EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(samples, 16_000))

    val ready = preparation as SpeechAudioPreparation.Ready
    assertTrue(ready.samples.size > 4_000)
    assertEquals(250L, ready.speechDurationMs)
    assertArrayEquals(original, samples, 0f)
  }

  @Test
  fun speechAtStartIsTrimmedWithoutLeavingAudioBounds() {
    val samples = FloatArray(8_000) { index -> if (index < 5_000) 0.2f else 0f }
    val preparation = EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(samples, 16_000))

    val ready = preparation as SpeechAudioPreparation.Ready
    assertTrue(ready.samples.isNotEmpty())
    assertTrue(ready.samples.size <= samples.size)
  }

  @Test
  fun speechAtEndIsTrimmedWithoutLeavingAudioBounds() {
    val samples = FloatArray(8_000) { index -> if (index >= 3_000) 0.2f else 0f }
    val preparation = EnergyBasedSpeechAudioPreprocessor(settings).prepare(PcmAudio(samples, 16_000))

    val ready = preparation as SpeechAudioPreparation.Ready
    assertTrue(ready.samples.isNotEmpty())
    assertTrue(ready.samples.size <= samples.size)
  }
}
