package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.Transcript

interface ChunkingService {
  fun split(transcript: Transcript, maxChars: Int): List<Transcript>
}
