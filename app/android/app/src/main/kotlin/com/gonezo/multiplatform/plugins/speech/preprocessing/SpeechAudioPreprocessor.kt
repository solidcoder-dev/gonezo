package com.gonezo.multiplatform.plugins.speech.preprocessing

import com.gonezo.multiplatform.plugins.speech.PcmAudio

interface SpeechAudioPreprocessor {
  fun prepare(audio: PcmAudio): SpeechAudioPreparation
}
