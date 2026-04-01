package com.gonezo.multiplatform.audioextraction.application;

import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;

public interface TranscriptionEngine {
  Transcript transcribe(SourceAudio audio);
}
