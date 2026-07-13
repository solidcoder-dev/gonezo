package com.gonezo.multiplatform.plugins.speech.quality

import com.gonezo.multiplatform.plugins.speech.RecognizedSpeechSegment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TranscriptQualityPolicyTest {
  @Test
  fun discardsSegmentsAboveTheNoSpeechThreshold() {
    val policy = DefaultTranscriptQualityPolicy(TranscriptQualitySettings(maximumNoSpeechProbability = 0.60f))

    val result = policy.evaluate(
      listOf(
        RecognizedSpeechSegment("hola", 0, 100, 0.61f),
        RecognizedSpeechSegment("mundo", 100, 200, 0.60f),
      ),
    )

    val ready = result as TranscriptQualityResult.Ready
    assertEquals("mundo", ready.text)
    assertEquals(1, ready.segments.size)
  }

  @Test
  fun discardsEmptySegmentsAndReturnsNoSpeechWhenNothingRemains() {
    val policy = DefaultTranscriptQualityPolicy()

    assertEquals(
      TranscriptQualityResult.NoSpeechDetected,
      policy.evaluate(listOf(RecognizedSpeechSegment("   ", 0, 100, 0.1f))),
    )
  }

  @Test
  fun joinsSegmentsWithNaturalSpacing() {
    val policy = DefaultTranscriptQualityPolicy()

    val result = policy.evaluate(
      listOf(
        RecognizedSpeechSegment("Gasté", 0, 100, 0.1f),
        RecognizedSpeechSegment("34,80", 100, 200, 0.1f),
        RecognizedSpeechSegment("euros", 200, 300, 0.1f),
      ),
    )

    val ready = result as TranscriptQualityResult.Ready
    assertEquals("Gasté 34,80 euros", ready.text)
    assertTrue(ready.segments.size == 3)
  }
}
