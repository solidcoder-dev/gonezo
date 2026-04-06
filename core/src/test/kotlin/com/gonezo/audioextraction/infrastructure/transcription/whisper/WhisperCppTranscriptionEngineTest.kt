package com.gonezo.audioextraction.infrastructure.transcription.whisper

import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.SourceAudio
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.catchThrowable
import org.junit.jupiter.api.Test

class WhisperCppTranscriptionEngineTest {
  @Test
  fun `transcribe should map native text into transcript`() {
    val engine = WhisperCppTranscriptionEngine(
      modelProvider = StaticModelProvider("/tmp/model.bin"),
      pcmDecoder = object : PcmDecoder {
        override fun decode(audio: SourceAudio): PcmAudio = PcmAudio(floatArrayOf(0.1f, 0.2f), 16_000)
      },
      nativeTranscriber = object : NativeTranscriber {
        override fun transcribe(modelPath: String, audio: PcmAudio, language: String?): String {
          return "coffee 12 euros"
        }
      },
    )

    val transcript = engine.transcribe(SourceAudio(byteArrayOf(1), "audio/wav", "fixture"))

    assertThat(transcript.text).isEqualTo("coffee 12 euros")
    assertThat(transcript.segments).hasSize(1)
  }

  @Test
  fun `transcribe should fail when native returns blank text`() {
    val engine = WhisperCppTranscriptionEngine(
      modelProvider = StaticModelProvider("/tmp/model.bin"),
      pcmDecoder = object : PcmDecoder {
        override fun decode(audio: SourceAudio): PcmAudio = PcmAudio(floatArrayOf(0.1f), 16_000)
      },
      nativeTranscriber = object : NativeTranscriber {
        override fun transcribe(modelPath: String, audio: PcmAudio, language: String?): String = ""
      },
    )

    val thrown = catchThrowable {
      engine.transcribe(SourceAudio(byteArrayOf(1), "audio/wav", "fixture"))
    }

    assertThat(thrown).isInstanceOf(AudioExtractionException::class.java)
    val extractionError = thrown as AudioExtractionException
    assertThat(extractionError.code).isEqualTo(ErrorCode.TRANSCRIPTION_FAILED)
  }
}
