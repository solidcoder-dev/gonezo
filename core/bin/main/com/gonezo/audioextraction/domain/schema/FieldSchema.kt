package com.gonezo.audioextraction.domain.schema

data class FieldSchema(
  val type: String,
  val format: String?,
  val enumValues: List<String> = emptyList(),
  val required: Boolean,
)
