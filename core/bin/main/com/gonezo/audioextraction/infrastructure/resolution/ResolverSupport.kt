package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate

object ResolverSupport {
  fun bestCandidate(candidates: List<FieldCandidate>): FieldCandidate? = candidates.maxByOrNull { it.confidence }

  fun clamp(confidence: Double): Double = when {
    confidence < 0.0 -> 0.0
    confidence > 1.0 -> 1.0
    else -> confidence
  }
}
