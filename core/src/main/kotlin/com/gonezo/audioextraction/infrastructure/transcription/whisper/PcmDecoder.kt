package com.gonezo.audioextraction.infrastructure.transcription.whisper

import com.gonezo.audioextraction.domain.model.SourceAudio

interface PcmDecoder {
  fun decode(audio: SourceAudio): PcmAudio
}
