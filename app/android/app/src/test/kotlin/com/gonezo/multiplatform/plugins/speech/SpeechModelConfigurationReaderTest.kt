package com.gonezo.multiplatform.plugins.speech

import java.math.BigInteger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class SpeechModelConfigurationReaderTest {
  @Test
  fun acceptsModelSizeAsAnInt() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
        "gonezo.speech.model.size" to 77691713,
        "gonezo.speech.model.sha256" to VALID_SHA,
      ),
    ).read()

    assertEquals(77691713L, configuration.expectedSize)
  }

  @Test
  fun acceptsModelSizeAsALong() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
        "gonezo.speech.model.size" to 77691713L,
        "gonezo.speech.model.sha256" to VALID_SHA,
      ),
    ).read()

    assertEquals(77691713L, configuration.expectedSize)
  }

  @Test
  fun acceptsModelSizeAsAnotherNumberType() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
        "gonezo.speech.model.size" to BigInteger("77691713"),
        "gonezo.speech.model.sha256" to VALID_SHA,
      ),
    ).read()

    assertEquals(77691713L, configuration.expectedSize)
  }

  @Test
  fun acceptsModelSizeAsANumericString() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
        "gonezo.speech.model.size" to " 77691713 ",
        "gonezo.speech.model.sha256" to VALID_SHA,
      ),
    ).read()

    assertEquals(77691713L, configuration.expectedSize)
  }

  @Test
  fun rejectsMissingModelSize() {
    val exception = assertThrows(SpeechModelConfigurationException::class.java) {
      readerFor(
        mapOf(
          "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
          "gonezo.speech.model.sha256" to VALID_SHA,
        ),
      ).read()
    }

    assertEquals("Speech model metadata is invalid: gonezo.speech.model.size", exception.message)
  }

  @Test
  fun rejectsZeroModelSize() {
    assertInvalidSize(0)
  }

  @Test
  fun rejectsNegativeModelSize() {
    assertInvalidSize(-1)
  }

  @Test
  fun rejectsNonNumericModelSizeString() {
    assertInvalidSize("not-a-number")
  }

  @Test
  fun rejectsEmptyModelSizeString() {
    assertInvalidSize("")
  }

  @Test
  fun usesTheDefaultAssetWhenAssetMetadataIsMissing() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.size" to 77691713,
        "gonezo.speech.model.sha256" to VALID_SHA,
      ),
    ).read()

    assertEquals("speech-transcription/whisper/ggml-tiny.bin", configuration.assetPath)
  }

  @Test
  fun rejectsBlankModelAsset() {
    assertInvalidAsset(" ")
  }

  @Test
  fun rejectsAbsoluteModelAsset() {
    assertInvalidAsset("/speech-transcription/whisper/ggml-tiny.bin")
  }

  @Test
  fun rejectsPathTraversalInModelAsset() {
    assertInvalidAsset("speech-transcription/../whisper/ggml-tiny.bin")
  }

  @Test
  fun normalizesTheSha256ValueToLowercase() {
    val configuration = readerFor(
      mapOf(
        "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
        "gonezo.speech.model.size" to 77691713,
        "gonezo.speech.model.sha256" to VALID_SHA.uppercase(),
      ),
    ).read()

    assertEquals(VALID_SHA, configuration.expectedSha256)
  }

  @Test
  fun rejectsMissingSha256() {
    val exception = assertThrows(SpeechModelConfigurationException::class.java) {
      readerFor(
        mapOf(
          "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
          "gonezo.speech.model.size" to 77691713,
        ),
      ).read()
    }

    assertEquals("Speech model metadata is invalid: gonezo.speech.model.sha256", exception.message)
  }

  @Test
  fun rejectsSha256WithTheWrongLength() {
    assertInvalidSha256("be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b2")
  }

  @Test
  fun rejectsSha256WithNonHexadecimalCharacters() {
    assertInvalidSha256("be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b2zz")
  }

  private fun assertInvalidSize(value: Any?) {
    val exception = assertThrows(SpeechModelConfigurationException::class.java) {
      readerFor(
        mapOf(
          "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
          "gonezo.speech.model.size" to value,
          "gonezo.speech.model.sha256" to VALID_SHA,
        ),
      ).read()
    }

    assertEquals("Speech model metadata is invalid: gonezo.speech.model.size", exception.message)
  }

  private fun assertInvalidAsset(value: String) {
    val exception = assertThrows(SpeechModelConfigurationException::class.java) {
      readerFor(
        mapOf(
          "gonezo.speech.model.asset" to value,
          "gonezo.speech.model.size" to 77691713,
          "gonezo.speech.model.sha256" to VALID_SHA,
        ),
      ).read()
    }

    assertEquals("Speech model metadata is invalid: gonezo.speech.model.asset", exception.message)
  }

  private fun assertInvalidSha256(value: String) {
    val exception = assertThrows(SpeechModelConfigurationException::class.java) {
      readerFor(
        mapOf(
          "gonezo.speech.model.asset" to "speech-transcription/whisper/ggml-tiny.bin",
          "gonezo.speech.model.size" to 77691713,
          "gonezo.speech.model.sha256" to value,
        ),
      ).read()
    }

    assertEquals("Speech model metadata is invalid: gonezo.speech.model.sha256", exception.message)
  }

  private fun readerFor(metadata: Map<String, Any?>): SpeechModelConfigurationReader {
    return SpeechModelConfigurationReader { key ->
      metadata[key]
    }
  }

  companion object {
    private const val VALID_SHA = "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21"
  }
}
