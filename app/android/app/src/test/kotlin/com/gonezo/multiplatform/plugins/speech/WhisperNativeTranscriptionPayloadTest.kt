package com.gonezo.multiplatform.plugins.speech

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class WhisperNativeTranscriptionPayloadTest {
  @Test
  fun keepsParallelSegmentArraysAligned() {
    val payload = parseWhisperNativeTranscriptionPayload(
      """{"text":"hola mundo","segments":{"text":["hola","mundo"],"startMs":[0,200],"endMs":[200,400],"noSpeechProbability":[0.1,0.2]}}""",
    ) as WhisperNativeTranscriptionPayload.Success

    assertEquals(2, payload.segments.size)
    assertEquals("hola", payload.segments[0].text)
    assertEquals(0.1f, payload.segments[0].noSpeechProbability, 0.0001f)
    assertEquals("mundo", payload.segments[1].text)
    assertEquals(0.2f, payload.segments[1].noSpeechProbability, 0.0001f)
  }

  @Test
  fun rejectsParallelArraysWithDifferentLengths() {
    assertThrows(IllegalArgumentException::class.java) {
      parseWhisperNativeTranscriptionPayload(
        """{"text":"hola","segments":{"text":["hola"],"startMs":[0],"endMs":[200],"noSpeechProbability":[0.1,0.2]}}""",
      )
    }
  }
}
