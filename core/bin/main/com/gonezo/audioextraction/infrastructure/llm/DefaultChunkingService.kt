package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.Segment
import com.gonezo.audioextraction.domain.model.Transcript

class DefaultChunkingService : ChunkingService {
  override fun split(transcript: Transcript, maxChars: Int): List<Transcript> {
    val text = transcript.text.trim()
    if (text.isEmpty() || maxChars <= 0 || text.length <= maxChars) {
      return listOf(transcript)
    }

    val chunks = mutableListOf<Transcript>()
    var start = 0
    while (start < text.length) {
      val end = minOf(text.length, start + maxChars)
      val chunkText = text.substring(start, end).trim()
      if (chunkText.isNotEmpty()) {
        chunks.add(Transcript(chunkText, listOf(Segment(chunkText, 0L, 0L))))
      }
      start = end
    }
    return chunks
  }
}
