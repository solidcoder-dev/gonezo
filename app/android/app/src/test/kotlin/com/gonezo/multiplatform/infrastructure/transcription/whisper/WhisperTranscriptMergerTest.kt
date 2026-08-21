package com.gonezo.multiplatform.infrastructure.transcription.whisper

import org.junit.Assert.assertEquals
import org.junit.Test

class WhisperTranscriptMergerTest {
  @Test
  fun removesCaseAndPunctuationInsensitiveWindowOverlap() {
    val merger = WhisperTranscriptMerger()

    merger.add("I spent twenty euros")
    merger.add("Twenty euros at Lidl")

    assertEquals("I spent twenty euros at Lidl", merger.text())
  }
}
