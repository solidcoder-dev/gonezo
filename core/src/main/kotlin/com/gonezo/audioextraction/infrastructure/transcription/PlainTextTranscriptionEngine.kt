package com.gonezo.audioextraction.infrastructure.transcription

import com.gonezo.audioextraction.application.pipeline.TranscriptionEngine
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.Segment
import com.gonezo.audioextraction.domain.model.SourceAudio
import com.gonezo.audioextraction.domain.model.Transcript
import java.nio.charset.StandardCharsets

class PlainTextTranscriptionEngine : TranscriptionEngine {
  override fun transcribe(audio: SourceAudio): Transcript {
    val bytes = audio.bytes
    if (bytes.isEmpty()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Audio source is empty")
    }

    val text = String(bytes, StandardCharsets.UTF_8).trim()
    if (text.isBlank()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Transcript is empty")
    }

    return Transcript(text, listOf(Segment(text, 0L, 0L)))
  }
}
