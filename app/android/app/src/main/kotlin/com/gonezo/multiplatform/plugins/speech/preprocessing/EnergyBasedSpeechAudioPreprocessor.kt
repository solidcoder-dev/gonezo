package com.gonezo.multiplatform.plugins.speech.preprocessing

import com.gonezo.multiplatform.plugins.speech.PcmAudio
import kotlin.math.max
import kotlin.math.roundToInt

class EnergyBasedSpeechAudioPreprocessor(
  private val settings: SpeechAudioPreprocessingSettings = SpeechAudioPreprocessingSettings(),
) : SpeechAudioPreprocessor {
  override fun prepare(audio: PcmAudio): SpeechAudioPreparation {
    val samples = audio.samples
    if (samples.isEmpty()) {
      return SpeechAudioPreparation.NoSpeech
    }

    val windowSamples = max(1, (audio.sampleRate * settings.windowDurationMs / 1000.0).roundToInt())
    val windowRmsValues = mutableListOf<Float>()
    var cursor = 0
    while (cursor < samples.size) {
      val nextCursor = minOf(samples.size, cursor + windowSamples)
      windowRmsValues += rms(samples, cursor, nextCursor)
      cursor = nextCursor
    }

    if (windowRmsValues.isEmpty()) {
      return SpeechAudioPreparation.NoSpeech
    }

    val noiseFloor = percentile20(windowRmsValues)
    val effectiveThreshold = max(settings.minimumAbsoluteRms, noiseFloor * settings.noiseFloorMultiplier)
    val speechWindows = windowRmsValues.map { it > effectiveThreshold }
    val firstSpeechWindow = speechWindows.indexOfFirst { it }
    if (firstSpeechWindow < 0) {
      return SpeechAudioPreparation.NoSpeech
    }
    val lastSpeechWindow = speechWindows.indexOfLast { it }

    val speechStartSample = firstSpeechWindow * windowSamples
    val speechEndSample = minOf(samples.size, (lastSpeechWindow + 1) * windowSamples)
    val speechDurationMs = ((speechEndSample - speechStartSample).toLong() * 1000L / audio.sampleRate.toLong())
    if (speechDurationMs < settings.minimumSpeechDurationMs) {
      return SpeechAudioPreparation.NoSpeech
    }

    val paddingSamples = (audio.sampleRate * settings.paddingDurationMs / 1000.0).roundToInt()
    val trimmedStart = max(0, speechStartSample - paddingSamples)
    val trimmedEnd = minOf(samples.size, speechEndSample + paddingSamples)
    if (trimmedEnd <= trimmedStart) {
      return SpeechAudioPreparation.NoSpeech
    }

    return SpeechAudioPreparation.Ready(
      samples = samples.copyOfRange(trimmedStart, trimmedEnd),
      speechDurationMs = speechDurationMs,
    )
  }

  private fun rms(samples: FloatArray, start: Int, end: Int): Float {
    if (start >= end) return 0f
    var sumSquares = 0.0
    for (index in start until end) {
      val sample = samples[index].toDouble()
      sumSquares += sample * sample
    }
    return kotlin.math.sqrt(sumSquares / (end - start)).toFloat()
  }

  private fun percentile20(values: List<Float>): Float {
    val sorted = values.sorted()
    val index = ((sorted.lastIndex) * 0.20f).toInt().coerceIn(0, sorted.lastIndex)
    return sorted[index]
  }
}
