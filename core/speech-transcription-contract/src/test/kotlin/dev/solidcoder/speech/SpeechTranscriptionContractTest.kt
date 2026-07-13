package dev.solidcoder.speech

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class SpeechTranscriptionContractTest {
  @Test
  fun `requires opaque audio references and meaningful transcripts`() {
    assertThatThrownBy { AudioSourceRef.of(" ") }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { Transcript(" ") }.isInstanceOf(IllegalArgumentException::class.java)
    assertThat(Transcript("hello").segments).isEmpty()
  }

  @Test
  fun `models optional language detection and recoverable failures`() {
    assertThat(TranscriptionRequest(AudioSourceRef.of("capture-1")).detectLanguageAutomatically).isTrue()
    val result = TranscriptionResult.failure(TranscriptionIssue("model-loading", "Try again later", TranscriptionIssueSeverity.RECOVERABLE))

    assertThat(result.isSuccess).isFalse()
    assertThat(result.issues.single().severity).isEqualTo(TranscriptionIssueSeverity.RECOVERABLE)
    assertThat(result.issues.single().recoverable).isTrue()
    assertThat(result.issues.single().retryable).isTrue()
  }

  @Test
  fun `rejects incompatible language options and definitive success issues`() {
    assertThatThrownBy { TranscriptionRequest(AudioSourceRef.of("capture-1"), language = " ") }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { TranscriptionRequest(AudioSourceRef.of("capture-1"), language = "es", detectLanguageAutomatically = true) }.isInstanceOf(IllegalArgumentException::class.java)
    assertThatThrownBy { TranscriptionResult(Transcript("hello"), listOf(TranscriptionIssue("native", "failed", TranscriptionIssueSeverity.DEFINITIVE))) }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `keeps silence probability and timestamp defaults on transcript segments`() {
    val segment = TranscriptSegment("hola", noSpeechProbability = 0.61f)

    assertThat(segment.startMs).isZero
    assertThat(segment.endMs).isZero
    assertThat(segment.noSpeechProbability).isEqualTo(0.61f)
  }
}
