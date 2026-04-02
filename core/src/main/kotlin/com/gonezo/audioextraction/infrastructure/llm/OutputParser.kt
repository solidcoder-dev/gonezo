package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.FieldCandidate

interface OutputParser {
  fun parse(output: String): Map<String, List<FieldCandidate>>
}
