package com.gonezo.audioextraction.application.pipeline

import com.gonezo.audioextraction.domain.model.SourceAudio
import com.gonezo.audioextraction.domain.model.Transcript

interface TranscriptionEngine {
  fun transcribe(audio: SourceAudio): Transcript
}
