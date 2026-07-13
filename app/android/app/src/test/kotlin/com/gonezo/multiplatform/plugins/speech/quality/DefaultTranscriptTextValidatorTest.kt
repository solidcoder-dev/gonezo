package com.gonezo.multiplatform.plugins.speech.quality

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DefaultTranscriptTextValidatorTest {
  private val validator = DefaultTranscriptTextValidator()

  @Test
  fun acceptsSpanishTextWithAccentsAndCurrency() {
    val valid = validator.validate("Gasté 34,80 € en alimentación.")
    assertEquals(TranscriptTextValidation.Valid("Gasté 34,80 € en alimentación."), valid)
    assertEquals("Gasté 34,80 € en alimentación.", (valid as TranscriptTextValidation.Valid).normalizedText)
  }

  @Test
  fun normalizesNfcWithoutStrippingSpanishCharacters() {
    val valid = validator.validate("Cafe\u0301 con pin\u0303a")
    assertEquals("Café con piña", (valid as TranscriptTextValidation.Valid).normalizedText)
  }

  @Test
  fun rejectsCorruptOutputAndSymbolNoise() {
    assertTrue(validator.validate("\uFFFD").let { it is TranscriptTextValidation.Invalid })
    assertTrue(validator.validate("██████").let { it is TranscriptTextValidation.Invalid })
    assertTrue(validator.validate("???????").let { it is TranscriptTextValidation.Invalid })
    assertTrue(validator.validate("\u0000texto").let { it is TranscriptTextValidation.Invalid })
    assertTrue(validator.validate("@@@@@@").let { it is TranscriptTextValidation.Invalid })
  }

  @Test
  fun rejectsTextWithoutLettersOrDigitsAndLowLanguageRatio() {
    assertTrue(validator.validate("1234 !!!!!!").let { it is TranscriptTextValidation.Invalid })
    assertTrue(validator.validate("!!!! ????").let { it is TranscriptTextValidation.Invalid })
  }
}
