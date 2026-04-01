package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.Segment;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.util.ArrayList;
import java.util.List;

public final class DefaultChunkingService implements ChunkingService {
  @Override
  public List<Transcript> split(Transcript transcript, int maxChars) {
    String text = transcript == null || transcript.text() == null ? "" : transcript.text().trim();
    if (text.isEmpty() || maxChars <= 0 || text.length() <= maxChars) {
      return List.of(transcript == null ? new Transcript("", List.of()) : transcript);
    }

    List<Transcript> chunks = new ArrayList<>();
    int start = 0;
    while (start < text.length()) {
      int end = Math.min(text.length(), start + maxChars);
      String chunkText = text.substring(start, end).trim();
      if (!chunkText.isEmpty()) {
        chunks.add(new Transcript(chunkText, List.of(new Segment(chunkText, 0L, 0L))));
      }
      start = end;
    }
    return chunks;
  }
}
