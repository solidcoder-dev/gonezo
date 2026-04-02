package com.gonezo.audioextraction.domain.model

data class Segment(
  val text: String,
  val startMs: Long,
  val endMs: Long,
)
