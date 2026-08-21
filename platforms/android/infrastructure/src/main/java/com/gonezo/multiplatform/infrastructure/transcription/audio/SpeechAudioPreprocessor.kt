package com.gonezo.multiplatform.infrastructure.transcription.audio

import com.gonezo.multiplatform.infrastructure.transcription.audio.PcmAudio

interface SpeechAudioPreprocessor {
  fun prepare(audio: PcmAudio): SpeechAudioPreparation
}
