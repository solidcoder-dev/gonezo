package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.List;

public interface ChunkingService {
  List<Transcript> split(Transcript transcript, int maxChars);
}
