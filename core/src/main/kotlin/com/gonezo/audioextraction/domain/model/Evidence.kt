package com.gonezo.audioextraction.domain.model

data class Evidence(
  val text: String,
  val startMs: Long,
  val endMs: Long,
)
