package com.gonezo.audioextraction.domain.model

data class Transcript(
  val text: String,
  val segments: List<Segment> = emptyList(),
)
